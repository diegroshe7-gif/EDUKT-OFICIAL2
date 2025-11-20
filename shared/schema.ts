import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tutors = pgTable("tutors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  edad: integer("edad").notNull(),
  email: text("email").notNull().unique(),
  telefono: text("telefono").notNull(),
  materias: text("materias").notNull(),
  modalidad: text("modalidad").notNull(),
  ubicacion: text("ubicacion"),
  tarifa: integer("tarifa").notNull(),
  disponibilidad: text("disponibilidad").notNull(),
  cvUrl: text("cv_url"),
  bio: text("bio"),
  stripeAccountId: text("stripe_account_id"),
  calLink: text("cal_link"),
  status: text("status").notNull().default("pendiente"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTutorSchema = createInsertSchema(tutors, {
  edad: z.coerce.number().int().positive(),
  tarifa: z.coerce.number().int().positive(),
}).omit({
  id: true,
  createdAt: true,
  status: true,
});

export type InsertTutor = z.infer<typeof insertTutorSchema>;
export type Tutor = typeof tutors.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
