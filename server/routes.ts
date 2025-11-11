import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTutorSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Tutor routes
  app.post("/api/tutors", async (req, res) => {
    try {
      const validatedData = insertTutorSchema.parse(req.body);
      const tutor = await storage.createTutor(validatedData);
      res.json(tutor);
    } catch (error) {
      if (error instanceof z.ZodError) {
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

  const httpServer = createServer(app);
  return httpServer;
}
