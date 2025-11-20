import { 
  type User, 
  type InsertUser, 
  type Tutor, 
  type InsertTutor,
  type Alumno,
  type InsertAlumno,
  type Sesion,
  type InsertSesion,
  type Review,
  type InsertReview
} from "@shared/schema";
import { db } from "./db";
import { users, tutors, alumnos, sesiones, reviews } from "@shared/schema";
import { eq, and, avg } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createTutor(tutor: InsertTutor): Promise<Tutor>;
  getTutorById(id: string): Promise<Tutor | undefined>;
  getTutorsByStatus(status: string): Promise<Tutor[]>;
  updateTutorStatus(id: string, status: string): Promise<Tutor | undefined>;
  getAllApprovedTutors(): Promise<Tutor[]>;
  
  createAlumno(alumno: InsertAlumno): Promise<Alumno>;
  getAlumnoById(id: string): Promise<Alumno | undefined>;
  getAlumnoByEmail(email: string): Promise<Alumno | undefined>;
  
  createSesion(sesion: InsertSesion): Promise<Sesion>;
  getSesionById(id: string): Promise<Sesion | undefined>;
  getSesionesByTutor(tutorId: string): Promise<Sesion[]>;
  getSesionesByAlumno(alumnoId: string): Promise<Sesion[]>;
  updateSesionStatus(id: string, status: string): Promise<Sesion | undefined>;
  
  createReview(review: InsertReview): Promise<Review>;
  getReviewsByTutor(tutorId: string): Promise<Review[]>;
  getAverageRatingForTutor(tutorId: string): Promise<number>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createTutor(tutor: InsertTutor): Promise<Tutor> {
    const result = await db.insert(tutors).values({
      ...tutor,
      status: "pendiente",
    }).returning();
    return result[0];
  }

  async getTutorById(id: string): Promise<Tutor | undefined> {
    const result = await db.select().from(tutors).where(eq(tutors.id, id)).limit(1);
    return result[0];
  }

  async getTutorsByStatus(status: string): Promise<Tutor[]> {
    return await db.select().from(tutors).where(eq(tutors.status, status));
  }

  async updateTutorStatus(id: string, status: string): Promise<Tutor | undefined> {
    const result = await db.update(tutors)
      .set({ status })
      .where(eq(tutors.id, id))
      .returning();
    return result[0];
  }

  async getAllApprovedTutors(): Promise<Tutor[]> {
    return await db.select().from(tutors).where(eq(tutors.status, "aprobado"));
  }

  async createAlumno(alumno: InsertAlumno): Promise<Alumno> {
    const result = await db.insert(alumnos).values(alumno).returning();
    return result[0];
  }

  async getAlumnoById(id: string): Promise<Alumno | undefined> {
    const result = await db.select().from(alumnos).where(eq(alumnos.id, id)).limit(1);
    return result[0];
  }

  async getAlumnoByEmail(email: string): Promise<Alumno | undefined> {
    const result = await db.select().from(alumnos).where(eq(alumnos.email, email)).limit(1);
    return result[0];
  }

  async createSesion(sesion: InsertSesion): Promise<Sesion> {
    const result = await db.insert(sesiones).values({
      ...sesion,
      status: "pendiente",
    }).returning();
    return result[0];
  }

  async getSesionById(id: string): Promise<Sesion | undefined> {
    const result = await db.select().from(sesiones).where(eq(sesiones.id, id)).limit(1);
    return result[0];
  }

  async getSesionesByTutor(tutorId: string): Promise<Sesion[]> {
    return await db.select().from(sesiones).where(eq(sesiones.tutorId, tutorId));
  }

  async getSesionesByAlumno(alumnoId: string): Promise<Sesion[]> {
    return await db.select().from(sesiones).where(eq(sesiones.alumnoId, alumnoId));
  }

  async updateSesionStatus(id: string, status: string): Promise<Sesion | undefined> {
    const result = await db.update(sesiones)
      .set({ status })
      .where(eq(sesiones.id, id))
      .returning();
    return result[0];
  }

  async createReview(review: InsertReview): Promise<Review> {
    const result = await db.insert(reviews).values(review).returning();
    return result[0];
  }

  async getReviewsByTutor(tutorId: string): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.tutorId, tutorId));
  }

  async getAverageRatingForTutor(tutorId: string): Promise<number> {
    const result = await db
      .select({ avg: avg(reviews.calificacion) })
      .from(reviews)
      .where(eq(reviews.tutorId, tutorId));
    
    return result[0]?.avg ? Number(result[0].avg) : 0;
  }
}

export const storage = new DbStorage();
