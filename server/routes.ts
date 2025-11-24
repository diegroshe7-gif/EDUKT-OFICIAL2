import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTutorSchema, insertAlumnoSchema, insertSesionSchema, insertReviewSchema, insertAvailabilitySlotSchema, insertSupportTicketSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import crypto from "crypto";
import { createTutoringSession, sendPasswordResetEmail, sendSupportTicketEmail, sendTutorApprovalEmail, sendTutorRejectionEmail } from "./google-calendar";
import { hashPassword, verifyPassword, verifyAdminCredentials } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { db } from "./db";
import { resetTokens } from "@shared/schema";
import { eq } from "drizzle-orm";

// Use test key in development, production key otherwise
const stripeKey = process.env.NODE_ENV === 'development' 
  ? process.env.TESTING_STRIPE_SECRET_KEY 
  : process.env.STRIPE_SECRET_KEY;

const stripe = stripeKey 
  ? new Stripe(stripeKey, { apiVersion: "2025-10-29.clover" })
  : null;

if (process.env.NODE_ENV === 'development') {
  console.log(`[Stripe] Using ${stripeKey ? 'TESTING_STRIPE_SECRET_KEY' : 'no Stripe key'}`);
}

// Generate HMAC token for booking verification
const BOOKING_TOKEN_SECRET = process.env.SESSION_SECRET || "edukt-booking-secret-key";

function generateBookingToken(paymentIntentId: string, alumnoId: string, tutorId: string): string {
  const timestamp = Date.now();
  const data = `${paymentIntentId}:${alumnoId}:${tutorId}:${timestamp}`;
  const signature = crypto.createHmac('sha256', BOOKING_TOKEN_SECRET)
    .update(data)
    .digest('hex');
  return `${data}:${signature}`;
}

function verifyBookingToken(token: string, paymentIntentId: string, alumnoId: string, tutorId: string): boolean {
  try {
    const parts = token.split(':');
    if (parts.length !== 5) {
      return false;
    }
    
    const [storedIntentId, storedAlumnoId, storedTutorId, timestamp, signature] = parts;
    
    // Verify all IDs match
    if (storedIntentId !== paymentIntentId || 
        storedAlumnoId !== alumnoId || 
        storedTutorId !== tutorId) {
      return false;
    }
    
    // Verify token is not too old (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return false;
    }
    
    // Verify signature
    const data = `${storedIntentId}:${storedAlumnoId}:${storedTutorId}:${timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', BOOKING_TOKEN_SECRET)
      .update(data)
      .digest('hex');
    
    return signature === expectedSignature;
  } catch (error) {
    return false;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // File serving
  app.get("/objects/*", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      // Extract the path after /objects/
      const relativePath = req.params[0];
      console.log("🔍 Request URL:", req.url);
      console.log("🔍 Extracted relativePath:", relativePath);
      
      const publicFile = await objectStorageService.searchPublicObject(relativePath);
      
      if (publicFile) {
        return objectStorageService.downloadObject(publicFile, res);
      }
      
      console.log("File not found in public directories:", relativePath);
      return res.sendStatus(404);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Upload URL endpoint
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, objectPath } = await objectStorageService.getPublicObjectUploadURL();
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Tutor routes
  app.post("/api/tutors", async (req, res) => {
    try {
      console.log("📥 Datos recibidos del cliente:", JSON.stringify({
        fotoPerfil: req.body.fotoPerfil,
        cvUrl: req.body.cvUrl
      }, null, 2));
      
      const validatedData = insertTutorSchema.parse(req.body);
      
      console.log("✅ Datos después de validación Zod:", JSON.stringify({
        fotoPerfil: validatedData.fotoPerfil,
        cvUrl: validatedData.cvUrl
      }, null, 2));
      
      const hashedPassword = await hashPassword(validatedData.password);
      const tutorData = { ...validatedData, password: hashedPassword };
      
      console.log("💾 Datos a guardar en DB:", JSON.stringify({
        fotoPerfil: tutorData.fotoPerfil,
        cvUrl: tutorData.cvUrl
      }, null, 2));
      
      const tutor = await storage.createTutor(tutorData);
      
      console.log("🎉 Tutor guardado en DB:", JSON.stringify({
        id: tutor.id,
        fotoPerfil: tutor.fotoPerfil,
        cvUrl: tutor.cvUrl
      }, null, 2));
      
      const { password, ...tutorResponse } = tutor;
      res.json(tutorResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid tutor data", details: error.errors });
      } else if ((error as any).code === '23505') {
        console.error("Error creating tutor:", error);
        res.status(409).json({ error: "Este correo electrónico ya está registrado. Por favor usa otro correo o inicia sesión." });
      } else {
        console.error("Error creating tutor:", error);
        res.status(500).json({ error: "Failed to create tutor" });
      }
    }
  });

  app.get("/api/tutors/approved", async (req, res) => {
    try {
      const tutors = await storage.getAllApprovedTutors();
      res.json(tutors);
    } catch (error) {
      console.error("Error fetching approved tutors:", error);
      res.status(500).json({ error: "Failed to fetch tutors" });
    }
  });

  app.get("/api/tutors/pending", async (req, res) => {
    try {
      const tutors = await storage.getTutorsByStatus("pendiente");
      res.json(tutors);
    } catch (error) {
      console.error("Error fetching pending tutors:", error);
      res.status(500).json({ error: "Failed to fetch tutors" });
    }
  });

  app.get("/api/tutors/rejected", async (req, res) => {
    try {
      const tutors = await storage.getTutorsByStatus("rechazado");
      res.json(tutors);
    } catch (error) {
      console.error("Error fetching rejected tutors:", error);
      res.status(500).json({ error: "Failed to fetch tutors" });
    }
  });

  app.get("/api/tutors/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const tutor = await storage.getTutorById(id);
      if (!tutor) {
        return res.status(404).json({ error: "Tutor not found" });
      }
      res.json(tutor);
    } catch (error) {
      console.error("Error fetching tutor:", error);
      res.status(500).json({ error: "Failed to fetch tutor" });
    }
  });

  app.patch("/api/tutors/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      
      const tutorToApprove = await storage.getTutorById(id);
      if (!tutorToApprove) {
        return res.status(404).json({ error: "Tutor not found" });
      }

      // Validate KYC
      if (!tutorToApprove.clabe || !tutorToApprove.banco || !tutorToApprove.rfc) {
        return res.status(400).json({ 
          error: "Información bancaria incompleta. El tutor debe proporcionar CLABE, banco y RFC." 
        });
      }

      if (!tutorToApprove.fechaNacimiento || !tutorToApprove.direccion || 
          !tutorToApprove.ciudad || !tutorToApprove.estado || !tutorToApprove.codigoPostal) {
        return res.status(400).json({ 
          error: "Información de verificación incompleta." 
        });
      }

      if (!/^\d{18}$/.test(tutorToApprove.clabe)) {
        return res.status(400).json({ error: "CLABE inválida." });
      }

      if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(tutorToApprove.rfc)) {
        return res.status(400).json({ error: "RFC inválido." });
      }

      const birthDate = new Date(tutorToApprove.fechaNacimiento);
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        return res.status(400).json({ error: "El tutor debe ser mayor de 18 años." });
      }

      let stripeAccountId = tutorToApprove.stripeAccountId;

      // Try Stripe Connect
      if (stripe && !stripeAccountId) {
        try {
          const nameParts = tutorToApprove.nombre.trim().split(/\s+/);
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || nameParts[0];

          const dob = new Date(tutorToApprove.fechaNacimiento);
          const dobDay = dob.getDate();
          const dobMonth = dob.getMonth() + 1;
          const dobYear = dob.getFullYear();

          const clientIp = req.ip || req.headers['x-forwarded-for'] as string || '127.0.0.1';

          console.log(`Creating Stripe Connect account for tutor ${id}`);

          const account = await stripe.accounts.create({
            type: 'custom',
            country: 'MX',
            email: tutorToApprove.email,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_type: 'individual',
            business_profile: {
              mcc: '8299',
              product_description: 'Servicios de tutoría académica',
            },
            individual: {
              email: tutorToApprove.email,
              first_name: firstName,
              last_name: lastName,
              dob: {
                day: dobDay,
                month: dobMonth,
                year: dobYear,
              },
              address: {
                line1: tutorToApprove.direccion,
                city: tutorToApprove.ciudad,
                state: tutorToApprove.estado,
                postal_code: tutorToApprove.codigoPostal,
                country: 'MX',
              },
              id_number: tutorToApprove.rfc,
            },
            tos_acceptance: {
              date: Math.floor(Date.now() / 1000),
              ip: clientIp,
            },
            metadata: {
              tutorId: id,
              nombre: tutorToApprove.nombre,
              rfc: tutorToApprove.rfc,
            },
          });

          stripeAccountId = account.id;
          console.log(`Created Stripe account: ${stripeAccountId}`);

          await stripe.accounts.createExternalAccount(stripeAccountId, {
            external_account: {
              object: 'bank_account',
              country: 'MX',
              currency: 'mxn',
              routing_number: tutorToApprove.clabe,
              account_number: tutorToApprove.clabe,
              account_holder_name: tutorToApprove.nombre,
              account_holder_type: 'individual',
            },
          });

          await storage.updateTutorStripeAccount(id, stripeAccountId);
        } catch (stripeError: any) {
          console.warn("Warning: Could not create Stripe Connect:", stripeError.message);
          console.log("Approving tutor without Stripe account");
        }
      }

      const tutor = await storage.updateTutorStatus(id, "aprobado");
      
      // Send approval email
      try {
        await sendTutorApprovalEmail(tutorToApprove.nombre, tutorToApprove.email);
        console.log(`Approval email sent to ${tutorToApprove.email}`);
      } catch (emailError) {
        console.error("Error sending approval email:", emailError);
        // Don't fail the approval if email fails
      }
      
      res.json(tutor);
    } catch (error) {
      console.error("Error approving tutor:", error);
      res.status(500).json({ error: "Failed to approve tutor" });
    }
  });

  app.patch("/api/tutors/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      
      const tutorToReject = await storage.getTutorById(id);
      if (!tutorToReject) {
        return res.status(404).json({ error: "Tutor not found" });
      }
      
      const tutor = await storage.updateTutorStatus(id, "rechazado");
      
      // Send rejection email
      try {
        await sendTutorRejectionEmail(tutorToReject.nombre, tutorToReject.email);
        console.log(`Rejection email sent to ${tutorToReject.email}`);
      } catch (emailError) {
        console.error("Error sending rejection email:", emailError);
        // Don't fail the rejection if email fails
      }
      
      res.json(tutor);
    } catch (error) {
      console.error("Error rejecting tutor:", error);
      res.status(500).json({ error: "Failed to reject tutor" });
    }
  });

  app.patch("/api/tutors/:id/photo", async (req, res) => {
    try {
      const { id } = req.params;
      const { fotoPerfil } = req.body;

      if (!fotoPerfil) {
        return res.status(400).json({ error: "fotoPerfil is required" });
      }

      const tutor = await storage.getTutorById(id);
      if (!tutor) {
        return res.status(404).json({ error: "Tutor not found" });
      }

      const updatedTutor = await storage.updateTutorPhoto(id, fotoPerfil);
      res.json(updatedTutor);
    } catch (error) {
      console.error("Error updating tutor photo:", error);
      res.status(500).json({ error: "Failed to update photo" });
    }
  });

  app.post("/api/tutors/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const tutor = await storage.getTutorByEmail(email);
      if (!tutor) {
        return res.status(401).json({ error: "Email o contraseña inválidos" });
      }

      const passwordValid = await verifyPassword(password, tutor.password);
      if (!passwordValid) {
        return res.status(401).json({ error: "Email o contraseña inválidos" });
      }

      const { password: _, ...tutorResponse } = tutor;
      res.json(tutorResponse);
    } catch (error) {
      console.error("Error logging in tutor:", error);
      res.status(500).json({ error: "Failed to log in" });
    }
  });

  // Student routes
  app.post("/api/alumnos", async (req, res) => {
    try {
      const validatedData = insertAlumnoSchema.parse(req.body);
      const hashedPassword = await hashPassword(validatedData.password);
      const alumnoData = { ...validatedData, password: hashedPassword };
      const alumno = await storage.createAlumno(alumnoData);
      const { password, ...alumnoResponse } = alumno;
      res.json(alumnoResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else if ((error as any).code === '23505') {
        console.error("Error creating alumno:", error);
        res.status(409).json({ error: "Este correo electrónico ya está registrado. Por favor usa otro correo o inicia sesión." });
      } else {
        console.error("Error creating alumno:", error);
        res.status(500).json({ error: "Failed to create student" });
      }
    }
  });

  app.get("/api/alumnos", async (req, res) => {
    try {
      const alumnos = await storage.getAllAlumnos();
      res.json(alumnos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  app.post("/api/alumnos/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const alumno = await storage.getAlumnoByEmail(email);
      if (!alumno) {
        return res.status(401).json({ error: "Email o contraseña inválidos" });
      }

      const passwordValid = await verifyPassword(password, alumno.password);
      if (!passwordValid) {
        return res.status(401).json({ error: "Email o contraseña inválidos" });
      }

      const { password: _, ...alumnoResponse } = alumno;
      res.json(alumnoResponse);
    } catch (error) {
      console.error("Error logging in alumno:", error);
      res.status(500).json({ error: "Failed to log in" });
    }
  });

  // Support tickets
  app.post("/api/support", async (req, res) => {
    try {
      const validatedData = insertSupportTicketSchema.parse(req.body);
      
      // Save ticket to database
      const ticket = await storage.createSupportTicket(validatedData);
      
      // Send email notification
      await sendSupportTicketEmail({
        nombre: validatedData.nombre,
        email: validatedData.email,
        userType: validatedData.userType,
        asunto: validatedData.asunto,
        mensaje: validatedData.mensaje,
      });
      
      res.json({ 
        success: true, 
        message: "Tu mensaje ha sido enviado. Nos pondremos en contacto contigo pronto.",
        ticketId: ticket.id
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Datos inválidos", details: error.errors });
      } else {
        console.error("Error creating support ticket:", error);
        res.status(500).json({ error: "No se pudo enviar tu mensaje. Por favor intenta de nuevo." });
      }
    }
  });

  // Create payment intent
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const { tutorId, alumnoId, hours, startTime, endTime } = req.body;

      if (!tutorId || !alumnoId || !hours) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const tutor = await storage.getTutorById(tutorId);
      if (!tutor) {
        return res.status(404).json({ error: "Tutor not found" });
      }

      const subtotal = Math.round(tutor.tarifa * hours * 100); // Convert to cents
      const platformFee = Math.round(subtotal * 0.08);
      const total = subtotal + platformFee;

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: total,
        currency: "mxn",
        description: `Tutoría con ${tutor.nombre} - ${hours} hora(s)`,
        metadata: {
          tutorId,
          alumnoId,
          hours: hours.toString(),
          startTime: startTime || '',
          endTime: endTime || '',
        },
      });

      // Generate booking token
      const bookingToken = generateBookingToken(paymentIntent.id, alumnoId, tutorId);

      res.json({
        clientSecret: paymentIntent.client_secret,
        bookingToken,
        amount: Math.round(total / 100), // Convert back to MXN
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Book session (calculate exact date/time based on slot and student's chosen times)
  app.post("/api/book-session", async (req, res) => {
    try {
      const { slotId, alumnoId, tutorId, startTimeMinutes, endTimeMinutes } = req.body;

      if (!slotId || !alumnoId || !tutorId || startTimeMinutes === null || endTimeMinutes === null) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get the availability slot
      const slot = await storage.getAvailabilitySlotById(slotId);
      if (!slot) {
        return res.status(404).json({ error: "Availability slot not found" });
      }

      // Validate times are within slot range
      if (startTimeMinutes < slot.startTime || endTimeMinutes > slot.endTime) {
        return res.status(400).json({ 
          error: `Times must be within ${minutesToTime(slot.startTime)} - ${minutesToTime(slot.endTime)}` 
        });
      }

      if (endTimeMinutes <= startTimeMinutes) {
        return res.status(400).json({ error: "End time must be after start time" });
      }

      // Calculate the actual date for this week
      // Find the next occurrence of this day of week
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentDayOfWeek = today.getDay();
      const slotDayOfWeek = slot.dayOfWeek;

      let daysUntilSlot = slotDayOfWeek - currentDayOfWeek;
      if (daysUntilSlot < 0) {
        daysUntilSlot += 7;
      }

      const sessionDate = new Date(today);
      sessionDate.setDate(sessionDate.getDate() + daysUntilSlot);

      // Set the start time
      const startHours = Math.floor(startTimeMinutes / 60);
      const startMins = startTimeMinutes % 60;
      sessionDate.setHours(startHours, startMins, 0, 0);

      // Calculate end time
      const endDate = new Date(sessionDate);
      const endHours = Math.floor(endTimeMinutes / 60);
      const endMins = endTimeMinutes % 60;
      endDate.setHours(endHours, endMins, 0, 0);

      const durationHours = (endTimeMinutes - startTimeMinutes) / 60;

      res.json({
        startTime: sessionDate.toISOString(),
        endTime: endDate.toISOString(),
        durationHours
      });
    } catch (error) {
      console.error("Error booking session:", error);
      res.status(500).json({ error: "Failed to book session" });
    }
  });

  // Helper function to convert minutes to time string
  function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Sessions
  app.post("/api/sesiones", async (req, res) => {
    try {
      const validatedData = insertSesionSchema.parse(req.body);
      const sesion = await storage.createSesion(validatedData);
      res.json(sesion);
    } catch (error) {
      console.error("Error creating sesion:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.post("/api/confirm-session", async (req, res) => {
    try {
      const { paymentIntentId, bookingToken, alumnoId, tutorId } = req.body;

      if (!paymentIntentId || !bookingToken || !alumnoId || !tutorId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Verify booking token
      if (!verifyBookingToken(bookingToken, paymentIntentId, alumnoId, tutorId)) {
        return res.status(400).json({ error: "Invalid booking token" });
      }

      // Check if session already exists (idempotency)
      const existingSession = await storage.getSesionByPaymentIntentId(paymentIntentId);
      if (existingSession) {
        console.log(`Session already exists for payment intent ${paymentIntentId}`);
        return res.json({ 
          sesion: existingSession,
          emailsSent: true,
          message: "Session already created"
        });
      }

      // Get payment intent details to extract hours and dates
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const durationHours = paymentIntent.metadata?.hours ? parseFloat(paymentIntent.metadata.hours) : 1;
      const startTimeStr = paymentIntent.metadata?.startTime;
      const endTimeStr = paymentIntent.metadata?.endTime;

      // Get tutor and alumno details
      const tutor = await storage.getTutorById(tutorId);
      const alumno = await storage.getAlumnoById(alumnoId);

      if (!tutor || !alumno) {
        return res.status(404).json({ error: "Tutor or student not found" });
      }

      // Use the actual scheduled start time from the user's selection
      const startTime = startTimeStr ? new Date(startTimeStr) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const tutorRate = tutor.tarifa || 300;
      const subtotal = tutorRate * durationHours;
      const platformFee = Math.round(subtotal * 0.08);
      const total = subtotal + platformFee;

      console.log(`Creating tutoring session for ${alumno.nombre} with ${tutor.nombre} - ${durationHours} hours on ${startTime.toISOString()}`);

      // Create calendar event and send emails
      const calendarResult = await createTutoringSession({
        tutorName: tutor.nombre,
        tutorEmail: tutor.email,
        studentName: alumno.nombre,
        studentEmail: alumno.email,
        startTime,
        durationHours,
      });

      // Create session in database
      const sesion = await storage.createSesion({
        tutorId,
        alumnoId,
        fecha: startTime,
        horas: durationHours,
        subtotal,
        platformFee,
        total,
        meetLink: calendarResult.meetLink,
        googleCalendarEventId: calendarResult.eventId,
        paymentIntentId,
      });

      console.log(`Session created with Meet link: ${calendarResult.meetLink}`);

      res.json({ 
        sesion,
        emailsSent: calendarResult.emailsSent,
        emailError: calendarResult.emailError,
      });
    } catch (error) {
      console.error("Error confirming session:", error);
      res.status(500).json({ error: "Failed to confirm session" });
    }
  });

  app.get("/api/sesiones/:id", async (req, res) => {
    try {
      const sesion = await storage.getSesionById(req.params.id);
      if (!sesion) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(sesion);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.get("/api/sesiones/tutor/:tutorId", async (req, res) => {
    try {
      const sesiones = await storage.getSesionesByTutor(req.params.tutorId);
      res.json(sesiones);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/sesiones/alumno/:alumnoId", async (req, res) => {
    try {
      const sesiones = await storage.getSesionesByAlumno(req.params.alumnoId);
      res.json(sesiones);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Reviews
  app.post("/api/reviews", async (req, res) => {
    try {
      const validatedData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(validatedData);
      res.json(review);
    } catch (error) {
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  app.get("/api/reviews/tutor/:tutorId", async (req, res) => {
    try {
      const reviews = await storage.getReviewsByTutor(req.params.tutorId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.get("/api/reviews/tutor/:tutorId/average", async (req, res) => {
    try {
      const average = await storage.getAverageRatingForTutor(req.params.tutorId);
      res.json({ rating: average });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch average" });
    }
  });

  // Availability slots
  app.post("/api/availability-slots", async (req, res) => {
    try {
      const validatedData = insertAvailabilitySlotSchema.parse(req.body);
      const slot = await storage.createAvailabilitySlot(validatedData);
      res.json(slot);
    } catch (error) {
      res.status(500).json({ error: "Failed to create slot" });
    }
  });

  app.get("/api/availability-slots/tutor/:tutorId", async (req, res) => {
    try {
      const slots = await storage.getAvailabilitySlotsByTutor(req.params.tutorId);
      res.json(slots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch slots" });
    }
  });

  app.delete("/api/availability-slots/:id", async (req, res) => {
    try {
      await storage.deleteAvailabilitySlot(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete slot" });
    }
  });

  // Password reset endpoints
  app.post("/api/auth/request-reset", async (req, res) => {
    try {
      const { email, userType } = req.body;
      
      if (!email || !userType) {
        return res.status(400).json({ error: "Email and userType required" });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

      await db.insert(resetTokens).values({
        email,
        userType,
        token: resetToken,
        expiresAt,
      });

      // Send email with reset token using Gmail API
      try {
        const emailSent = await sendPasswordResetEmail(email, resetToken, userType);
        if (!emailSent) {
          throw new Error('Failed to send email');
        }
      } catch (emailError) {
        console.error('Error sending reset email:', emailError);
        return res.status(500).json({ 
          error: "No se pudo enviar el email. Intenta nuevamente más tarde." 
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error requesting reset:", error);
      res.status(500).json({ error: "Failed to request reset" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword, userType } = req.body;

      const result = await db.select().from(resetTokens).where(eq(resetTokens.token, token)).limit(1);
      const resetToken = result[0];

      if (!resetToken) {
        return res.status(400).json({ error: "Invalid reset token" });
      }

      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ error: "Reset token expired" });
      }

      const hashedPassword = await hashPassword(newPassword);

      if (userType === "tutor") {
        await storage.updateTutorPasswordByEmail(resetToken.email, hashedPassword);
      } else {
        await storage.updateAlumnoPasswordByEmail(resetToken.email, hashedPassword);
      }

      // Delete used token
      await db.delete(resetTokens).where(eq(resetTokens.token, token));

      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
