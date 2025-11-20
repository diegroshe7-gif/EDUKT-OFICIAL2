import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTutorSchema, insertAlumnoSchema, insertSesionSchema, insertReviewSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import crypto from "crypto";
import { createTutoringSession } from "./google-calendar";
import { hashPassword, verifyPassword, verifyAdminCredentials } from "./auth";

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-10-29.clover" })
  : null;

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
      const tutor = await storage.updateTutorStatus(id, "aprobado");
      if (!tutor) {
        return res.status(404).json({ error: "Tutor not found" });
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

      // Create session with verified data
      const sesion = await storage.createSesion({
        tutorId,
        alumnoId,
        fecha: sessionDate,
        horas: parseInt(hours),
        meetLink,
        googleCalendarEventId,
        paymentIntentId,
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

  const httpServer = createServer(app);
  return httpServer;
}
