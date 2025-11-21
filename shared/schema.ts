import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tutors = pgTable("tutors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  edad: integer("edad").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  telefono: text("telefono").notNull(),
  materias: text("materias").notNull(),
  modalidad: text("modalidad").notNull(),
  ubicacion: text("ubicacion"),
  tarifa: integer("tarifa").notNull(),
  disponibilidad: text("disponibilidad").notNull(),
  cvUrl: text("cv_url"),
  bio: text("bio"),
  universidad: text("universidad"),
  fotoPerfil: text("foto_perfil"),
  stripeAccountId: text("stripe_account_id"),
  calLink: text("cal_link"),
  status: text("status").notNull().default("pendiente"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTutorSchema = createInsertSchema(tutors, {
  edad: z.coerce.number().int().positive(),
  tarifa: z.coerce.number().int().positive(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
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

export const alumnos = pgTable("alumnos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  edad: integer("edad").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAlumnoSchema = createInsertSchema(alumnos, {
  edad: z.coerce.number().int().positive(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertAlumno = z.infer<typeof insertAlumnoSchema>;
export type Alumno = typeof alumnos.$inferSelect;

export const sesiones = pgTable("sesiones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tutorId: varchar("tutor_id").notNull().references(() => tutors.id),
  alumnoId: varchar("alumno_id").notNull().references(() => alumnos.id),
  fecha: timestamp("fecha").notNull(),
  horas: integer("horas").notNull(),
  meetLink: text("meet_link"),
  googleCalendarEventId: text("google_calendar_event_id"),
  paymentIntentId: text("payment_intent_id").notNull().unique(),
  subtotal: integer("subtotal").notNull().default(0),
  platformFee: integer("platform_fee").notNull().default(0),
  total: integer("total").notNull().default(0),
  status: text("status").notNull().default("pendiente"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSesionSchema = createInsertSchema(sesiones, {
  horas: z.coerce.number().int().positive(),
  subtotal: z.coerce.number().int().positive(),
  platformFee: z.coerce.number().int().nonnegative(),
  total: z.coerce.number().int().positive(),
}).omit({
  id: true,
  createdAt: true,
  status: true,
});

export type InsertSesion = z.infer<typeof insertSesionSchema>;
export type Sesion = typeof sesiones.$inferSelect;

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tutorId: varchar("tutor_id").notNull().references(() => tutors.id),
  alumnoId: varchar("alumno_id").notNull().references(() => alumnos.id),
  sesionId: varchar("sesion_id").references(() => sesiones.id),
  calificacion: integer("calificacion").notNull(),
  comentario: text("comentario"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviews, {
  calificacion: z.coerce.number().int().min(0).max(5),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export const availabilitySlots = pgTable("availability_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tutorId: varchar("tutor_id").notNull().references(() => tutors.id),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAvailabilitySlotSchema = createInsertSchema(availabilitySlots, {
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.coerce.number().int().min(0).max(1439),
  endTime: z.coerce.number().int().min(0).max(1439),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertAvailabilitySlot = z.infer<typeof insertAvailabilitySlotSchema>;
export type AvailabilitySlot = typeof availabilitySlots.$inferSelect;
