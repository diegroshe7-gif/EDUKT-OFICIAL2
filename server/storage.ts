import { type User, type InsertUser, type Tutor, type InsertTutor } from "@shared/schema";
import { db } from "./db";
import { users, tutors } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createTutor(tutor: InsertTutor): Promise<Tutor>;
  getTutorById(id: string): Promise<Tutor | undefined>;
  getTutorsByStatus(status: string): Promise<Tutor[]>;
  updateTutorStatus(id: string, status: string): Promise<Tutor | undefined>;
  getAllApprovedTutors(): Promise<Tutor[]>;
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
}

export const storage = new DbStorage();
