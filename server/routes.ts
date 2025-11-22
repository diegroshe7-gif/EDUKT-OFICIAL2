import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTutorSchema, insertAlumnoSchema, insertSesionSchema, insertReviewSchema, insertAvailabilitySlotSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import crypto from "crypto";
import { createTutoringSession } from "./google-calendar";
import { hashPassword, verifyPassword, verifyAdminCredentials } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

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
  // Referenced from blueprint:javascript_object_storage - Public file uploading endpoints
  // This endpoint serves uploaded files with ACL enforcement
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      // Extract the relative path from the request
      const relativePath = req.params.objectPath;
      
      // Try to find the file in public directories first
      const publicFile = await objectStorageService.searchPublicObject(relativePath);
      
      if (publicFile) {
        // File found in public directory - accessible without authentication
        return objectStorageService.downloadObject(publicFile, res);
      }
      
      // If not found in public, try private directory
      try {
        const privateFile = await objectStorageService.getObjectEntityFile(req.path);
        
        // For private files, check ACL authorization
        // In this MVP, tutor registration files are public (stored in public dir)
        // Private files would require authentication which we don't have yet
        // For now, reject access to private files
        console.log("Attempted access to private file without authentication:", req.path);
        return res.status(403).json({ 
          error: "Access denied. This file requires authentication." 
        });
      } catch (privateError) {
        // File not found in either public or private directories
        if (privateError instanceof ObjectNotFoundError) {
          return res.sendStatus(404);
        }
        throw privateError;
      }
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // This endpoint gets the presigned upload URL for file uploads (public)
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
      console.log("POST /api/tutors - Request body:", JSON.stringify(req.body, null, 2));
      const validatedData = insertTutorSchema.parse(req.body);
      
      // Hash password before storing
      const hashedPassword = await hashPassword(validatedData.password);
      const tutorData = { ...validatedData, password: hashedPassword };
      
      const tutor = await storage.createTutor(tutorData);
      
      // Never return password in response
      const { password, ...tutorResponse } = tutor;
      res.json(tutorResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", JSON.stringify(error.errors, null, 2));
        res.status(400).json({ error: "Invalid tutor data", details: error.errors });
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
      
      // Get tutor details first
      const tutorToApprove = await storage.getTutorById(id);
      if (!tutorToApprove) {
        return res.status(404).json({ error: "Tutor not found" });
      }

      // Validate all required KYC information is complete
      if (!tutorToApprove.clabe || !tutorToApprove.banco || !tutorToApprove.rfc) {
        return res.status(400).json({ 
          error: "Información bancaria incompleta. El tutor debe proporcionar CLABE, banco y RFC." 
        });
      }

      if (!tutorToApprove.fechaNacimiento || !tutorToApprove.direccion || 
          !tutorToApprove.ciudad || !tutorToApprove.estado || !tutorToApprove.codigoPostal) {
        return res.status(400).json({ 
          error: "Información de verificación incompleta. El tutor debe proporcionar fecha de nacimiento, dirección completa, ciudad, estado y código postal." 
        });
      }

      // Validate CLABE format (18 digits)
      if (!/^\d{18}$/.test(tutorToApprove.clabe)) {
        return res.status(400).json({ 
          error: "CLABE inválida. Debe tener exactamente 18 dígitos." 
        });
      }

      // Validate RFC format (12 or 13 characters)
      if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(tutorToApprove.rfc)) {
        return res.status(400).json({ 
          error: "RFC inválido. Debe tener el formato correcto (12 o 13 caracteres)." 
        });
      }

      // Validate age (18+)
      const birthDate = new Date(tutorToApprove.fechaNacimiento);
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        return res.status(400).json({ 
          error: "El tutor debe ser mayor de 18 años." 
        });
      }

      let stripeAccountId = tutorToApprove.stripeAccountId;

      // Create Stripe Connect account if Stripe is configured and account doesn't exist
      if (!stripe) {
        return res.status(503).json({ 
          error: "Stripe no está configurado. No se pueden procesar pagos en este momento." 
        });
      }

      if (!stripeAccountId) {
        try {
          // Split name into first and last name
          const nameParts = tutorToApprove.nombre.trim().split(/\s+/);
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || nameParts[0]; // Use first name if no last name

          // Extract date components
          const dob = new Date(tutorToApprove.fechaNacimiento);
          const dobDay = dob.getDate();
          const dobMonth = dob.getMonth() + 1; // JavaScript months are 0-indexed
          const dobYear = dob.getFullYear();

          // Get client IP for TOS acceptance
          const clientIp = req.ip || req.headers['x-forwarded-for'] as string || '127.0.0.1';

          console.log(`Creating Stripe Connect account for tutor ${id} (${tutorToApprove.email})`);

          // Create Custom connected account
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
              mcc: '8299', // Educational services
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
              id_number: tutorToApprove.rfc, // RFC serves as tax ID for individuals in Mexico
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

          // Add external bank account using CLABE
          // For Mexico, CLABE is used as both routing_number and account_number
          await stripe.accounts.createExternalAccount(stripeAccountId, {
            external_account: {
              object: 'bank_account',
              country: 'MX',
              currency: 'mxn',
              routing_number: tutorToApprove.clabe, // 18-digit CLABE
              account_number: tutorToApprove.clabe, // Same 18-digit CLABE
              account_holder_name: tutorToApprove.nombre,
              account_holder_type: 'individual',
            },
          });

          console.log(`Added bank account (CLABE ending in ${tutorToApprove.clabe.slice(-4)}) to Stripe account ${stripeAccountId}`);

          // Update tutor with Stripe account ID
          await storage.updateTutorStripeAccount(id, stripeAccountId);
          console.log(`Updated tutor ${id} with Stripe account ID`);

        } catch (stripeError: any) {
          console.error("Error creating Stripe Connect account:", stripeError);
          // Don't approve tutor if Stripe account creation fails
          return res.status(500).json({ 
            error: `Error al crear cuenta de Stripe: ${stripeError.message || 'Error desconocido'}. El tutor no ha sido aprobado.` 
          });
        }
      }

      // Approve the tutor
      const tutor = await storage.updateTutorStatus(id, "aprobado");
      
      console.log(`Tutor ${id} approved successfully with Stripe account ${stripeAccountId || 'N/A'}`);
      
      res.json(tutor);
    } catch (error) {
      console.error("Error approving tutor:", error);
      res.status(500).json({ error: "Failed to approve tutor" });
    }
  });

  app.patch("/api/tutors/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const tutor = await storage.updateTutorStatus(id, "rechazado");
      if (!tutor) {
        return res.status(404).json({ error: "Tutor not found" });
      }
      res.json(tutor);
    } catch (error) {
      console.error("Error rejecting tutor:", error);
      res.status(500).json({ error: "Failed to reject tutor" });
    }
  });

  // Stripe payment route for tutor bookings
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ 
          error: "Stripe not configured. Please add STRIPE_SECRET_KEY to environment." 
        });
      }

      const { tutorId, alumnoId, hours } = req.body;
      
      if (!tutorId || !alumnoId || !hours || hours < 1) {
        return res.status(400).json({ error: "Missing or invalid required fields" });
      }

      // Validate alumno exists
      const alumno = await storage.getAlumnoById(alumnoId);
      if (!alumno) {
        return res.status(404).json({ error: "Alumno not found" });
      }

      // Look up tutor server-side to get authoritative pricing
      const tutor = await storage.getTutorById(tutorId);
      
      if (!tutor) {
        return res.status(404).json({ error: "Tutor not found" });
      }

      if (tutor.status !== "aprobado") {
        return res.status(403).json({ error: "Tutor is not approved for bookings" });
      }

      // Calculate pricing server-side using trusted data
      const subtotal = Math.round(tutor.tarifa * hours);
      const serviceFee = Math.round(subtotal * 0.08);
      const total = subtotal + serviceFee;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: total * 100, // Convert MXN to centavos
        currency: "mxn",
        metadata: {
          tutorId: tutor.id,
          alumnoId: alumno.id,
          tutorName: tutor.nombre,
          hours: hours.toString(),
          subtotal: subtotal.toString(),
          serviceFee: serviceFee.toString(),
        },
        description: `Clase de tutoría con ${tutor.nombre} - ${hours}h`,
      });

      // Generate secure booking token to bind this payment to specific alumno and tutor
      const bookingToken = generateBookingToken(paymentIntent.id, alumno.id, tutor.id);

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        bookingToken,
        amount: total,
        subtotal,
        serviceFee,
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ 
        error: "Error creating payment intent: " + error.message 
      });
    }
  });

  // Confirm session after successful payment
  app.post("/api/confirm-session", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ 
          error: "Stripe not configured." 
        });
      }

      const { paymentIntentId, bookingToken, alumnoId, tutorId } = req.body;
      
      if (!paymentIntentId || !bookingToken || !alumnoId || !tutorId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Retrieve and verify payment intent from Stripe first
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ error: "Payment not successful" });
      }

      // Extract session data from trusted metadata
      const metadataTutorId = paymentIntent.metadata.tutorId;
      const metadataAlumnoId = paymentIntent.metadata.alumnoId;
      const hours = paymentIntent.metadata.hours;
      
      if (!metadataTutorId || !metadataAlumnoId || !hours) {
        return res.status(400).json({ error: "Invalid payment metadata" });
      }

      // Verify that provided IDs match metadata from Stripe (trusted source)
      if (tutorId !== metadataTutorId || alumnoId !== metadataAlumnoId) {
        return res.status(403).json({ error: "Invalid request" });
      }

      // Verify booking token binds to this specific payment/alumno/tutor
      if (!verifyBookingToken(bookingToken, paymentIntentId, alumnoId, tutorId)) {
        return res.status(403).json({ error: "Invalid or expired booking token" });
      }

      // Check if session already exists for this paymentIntentId (idempotency)
      const existingSession = await storage.getSesionByPaymentIntentId(paymentIntentId);
      
      if (existingSession) {
        return res.json(existingSession); // Return existing session, prevent duplicates
      }

      // Revalidate alumno still exists
      const alumno = await storage.getAlumnoById(alumnoId);
      if (!alumno) {
        return res.status(404).json({ error: "Student information not found" });
      }

      // Revalidate tutor still exists and is approved
      const tutor = await storage.getTutorById(tutorId);
      if (!tutor) {
        return res.status(404).json({ error: "Tutor information not found" });
      }

      if (tutor.status !== "aprobado") {
        return res.status(403).json({ error: "Booking cannot be completed" });
      }

      // Schedule session for 7 days from now (placeholder - can be customized)
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() + 7);
      sessionDate.setHours(10, 0, 0, 0); // 10 AM by default

      // Calculate payment amounts
      const subtotal = tutor.tarifa * parseInt(hours);
      const platformFee = Math.round(subtotal * 0.08);
      const total = subtotal + platformFee;

      // Create Google Calendar event with Google Meet link
      let meetLink = '';
      let googleCalendarEventId = '';
      
      try {
        const calendarResult = await createTutoringSession({
          tutorName: tutor.nombre,
          tutorEmail: tutor.email,
          studentName: `${alumno.nombre} ${alumno.apellido}`,
          studentEmail: alumno.email,
          startTime: sessionDate,
          durationHours: parseInt(hours),
        });
        
        meetLink = calendarResult.meetLink;
        googleCalendarEventId = calendarResult.eventId;
      } catch (calError) {
        console.error("Error creating calendar event:", calError);
        // Continue session creation even if calendar fails
      }

      // Create session with verified data and payment amounts
      const sesion = await storage.createSesion({
        tutorId,
        alumnoId,
        fecha: sessionDate,
        horas: parseInt(hours),
        meetLink,
        googleCalendarEventId,
        paymentIntentId,
        subtotal,
        platformFee,
        total,
      });

      res.json(sesion);
    } catch (error: any) {
      console.error("Error confirming session:", error);
      res.status(500).json({ 
        error: "Error creating session: " + error.message 
      });
    }
  });

  // Alumno routes
  app.post("/api/alumnos", async (req, res) => {
    try {
      const validatedData = insertAlumnoSchema.parse(req.body);
      
      const existing = await storage.getAlumnoByEmail(validatedData.email);
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }
      
      // Hash password before storing
      const hashedPassword = await hashPassword(validatedData.password);
      const alumnoData = { ...validatedData, password: hashedPassword };
      
      const alumno = await storage.createAlumno(alumnoData);
      
      // Never return password in response
      const { password, ...alumnoResponse } = alumno;
      res.json(alumnoResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid alumno data", details: error.errors });
      } else {
        console.error("Error creating alumno:", error);
        res.status(500).json({ error: "Failed to create alumno" });
      }
    }
  });

  app.get("/api/alumnos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const alumno = await storage.getAlumnoById(id);
      if (!alumno) {
        return res.status(404).json({ error: "Alumno not found" });
      }
      // Never return password
      const { password, ...alumnoResponse } = alumno;
      res.json(alumnoResponse);
    } catch (error) {
      console.error("Error fetching alumno:", error);
      res.status(500).json({ error: "Failed to fetch alumno" });
    }
  });

  // Login endpoints
  app.post("/api/alumnos/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email y contraseña son requeridos" });
      }
      
      const alumno = await storage.getAlumnoByEmail(email);
      if (!alumno) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }
      
      const isValid = await verifyPassword(password, alumno.password);
      if (!isValid) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }
      
      // Never return password
      const { password: _, ...alumnoResponse } = alumno;
      res.json(alumnoResponse);
    } catch (error) {
      console.error("Error during alumno login:", error);
      res.status(500).json({ error: "Error al iniciar sesión" });
    }
  });

  app.post("/api/tutors/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email y contraseña son requeridos" });
      }
      
      const tutor = await storage.getTutorByEmail(email);
      if (!tutor) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }
      
      const isValid = await verifyPassword(password, tutor.password);
      if (!isValid) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }
      
      // Never return password
      const { password: _, ...tutorResponse } = tutor;
      res.json(tutorResponse);
    } catch (error) {
      console.error("Error during tutor login:", error);
      res.status(500).json({ error: "Error al iniciar sesión" });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
      }
      
      const isValid = verifyAdminCredentials(username, password);
      if (!isValid) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }
      
      res.json({ 
        username: "diegovictor778",
        role: "admin"
      });
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ error: "Error al iniciar sesión" });
    }
  });

  // Sesion routes
  app.post("/api/sesiones", async (req, res) => {
    try {
      const validatedData = insertSesionSchema.parse(req.body);
      const sesion = await storage.createSesion(validatedData);
      res.json(sesion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid sesion data", details: error.errors });
      } else {
        console.error("Error creating sesion:", error);
        res.status(500).json({ error: "Failed to create sesion" });
      }
    }
  });

  app.get("/api/sesiones/tutor/:tutorId", async (req, res) => {
    try {
      const { tutorId } = req.params;
      const sesiones = await storage.getSesionesByTutor(tutorId);
      res.json(sesiones);
    } catch (error) {
      console.error("Error fetching tutor sesiones:", error);
      res.status(500).json({ error: "Failed to fetch sesiones" });
    }
  });

  app.get("/api/sesiones/alumno/:alumnoId", async (req, res) => {
    try {
      const { alumnoId } = req.params;
      const sesiones = await storage.getSesionesByAlumno(alumnoId);
      res.json(sesiones);
    } catch (error) {
      console.error("Error fetching alumno sesiones:", error);
      res.status(500).json({ error: "Failed to fetch sesiones" });
    }
  });

  // Admin endpoint: Get all sessions
  app.get("/api/sesiones", async (req, res) => {
    try {
      const sesiones = await storage.getAllSesiones();
      res.json(sesiones);
    } catch (error) {
      console.error("Error fetching all sesiones:", error);
      res.status(500).json({ error: "Failed to fetch sesiones" });
    }
  });

  // Admin endpoint: Get all alumnos
  app.get("/api/alumnos", async (req, res) => {
    try {
      const alumnos = await storage.getAllAlumnos();
      res.json(alumnos);
    } catch (error) {
      console.error("Error fetching all alumnos:", error);
      res.status(500).json({ error: "Failed to fetch alumnos" });
    }
  });

  // Review routes
  app.post("/api/reviews", async (req, res) => {
    try {
      const validatedData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(validatedData);
      res.json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid review data", details: error.errors });
      } else {
        console.error("Error creating review:", error);
        res.status(500).json({ error: "Failed to create review" });
      }
    }
  });

  app.get("/api/reviews/tutor/:tutorId", async (req, res) => {
    try {
      const { tutorId } = req.params;
      const reviews = await storage.getReviewsByTutor(tutorId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.get("/api/tutors/:id/rating", async (req, res) => {
    try {
      const { id } = req.params;
      const rating = await storage.getAverageRatingForTutor(id);
      res.json({ rating });
    } catch (error) {
      console.error("Error fetching tutor rating:", error);
      res.status(500).json({ error: "Failed to fetch rating" });
    }
  });

  // Availability Slot routes
  app.get("/api/tutors/:id/availability", async (req, res) => {
    try {
      const { id } = req.params;
      const slots = await storage.getAvailabilitySlotsByTutor(id);
      res.json(slots);
    } catch (error) {
      console.error("Error fetching availability slots:", error);
      res.status(500).json({ error: "Failed to fetch availability slots" });
    }
  });

  app.post("/api/tutors/:id/availability", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertAvailabilitySlotSchema.parse({
        ...req.body,
        tutorId: id
      });
      
      // Validate slot times
      if (validatedData.endTime <= validatedData.startTime) {
        return res.status(400).json({ error: "La hora de fin debe ser posterior a la hora de inicio" });
      }
      
      const slot = await storage.createAvailabilitySlot(validatedData);
      res.json(slot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid slot data", details: error.errors });
      } else {
        console.error("Error creating availability slot:", error);
        res.status(500).json({ error: "Failed to create availability slot" });
      }
    }
  });

  app.delete("/api/availability-slots/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAvailabilitySlot(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting availability slot:", error);
      res.status(500).json({ error: "Failed to delete availability slot" });
    }
  });

  app.patch("/api/tutors/:id/toggle-availability", async (req, res) => {
    try {
      const { id } = req.params;
      const { isAvailable } = req.body;
      
      if (typeof isAvailable !== 'boolean') {
        return res.status(400).json({ error: "isAvailable must be a boolean" });
      }
      
      const tutor = await storage.updateTutorAvailability(id, isAvailable);
      if (!tutor) {
        return res.status(404).json({ error: "Tutor not found" });
      }
      
      res.json(tutor);
    } catch (error) {
      console.error("Error toggling tutor availability:", error);
      res.status(500).json({ error: "Failed to toggle availability" });
    }
  });

  // Helper function to calculate next occurrence of a weekday
  function calculateNextOccurrence(dayOfWeek: number, startTimeMinutes: number, durationHours: number): { startTime: Date; endTime: Date } {
    const now = new Date();
    const currentDay = now.getDay();
    
    let daysUntilTarget = dayOfWeek - currentDay;
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }
    
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysUntilTarget);
    
    const hours = Math.floor(startTimeMinutes / 60);
    const minutes = startTimeMinutes % 60;
    targetDate.setHours(hours, minutes, 0, 0);
    
    const startTime = targetDate;
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
    
    return { startTime, endTime };
  }

  // Booking route with smart date calculation
  app.post("/api/book-session", async (req, res) => {
    try {
      const { slotId, alumnoId, tutorId, horas } = req.body;
      
      if (!slotId || !alumnoId || !tutorId || !horas) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Verify alumno exists
      const alumno = await storage.getAlumnoById(alumnoId);
      if (!alumno) {
        return res.status(404).json({ error: "Alumno not found" });
      }
      
      // Verify tutor exists and is approved and available
      const tutor = await storage.getTutorById(tutorId);
      if (!tutor) {
        return res.status(404).json({ error: "Tutor not found" });
      }
      if (tutor.status !== "aprobado") {
        return res.status(400).json({ error: "Tutor not approved" });
      }
      if (!tutor.isAvailable) {
        return res.status(400).json({ error: "Tutor is not currently available" });
      }
      
      // Get availability slot
      const slots = await storage.getAvailabilitySlotsByTutor(tutorId);
      const slot = slots.find(s => s.id === slotId);
      if (!slot) {
        return res.status(404).json({ error: "Availability slot not found" });
      }
      
      // Calculate next occurrence of this day
      const { startTime, endTime } = calculateNextOccurrence(slot.dayOfWeek, slot.startTime, horas);
      
      res.json({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        slot: {
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime
        }
      });
    } catch (error) {
      console.error("Error booking session:", error);
      res.status(500).json({ error: "Failed to book session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
