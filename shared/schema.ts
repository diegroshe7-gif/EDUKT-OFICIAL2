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
  disponibilidad: text("disponibilidad"),
  cvUrl: text("cv_url"),
  bio: text("bio"),
  universidad: text("universidad"),
  fotoPerfil: text("foto_perfil"),
  stripeAccountId: text("stripe_account_id"),
  clabe: text("clabe").notNull(),
  banco: text("banco").notNull(),
  rfc: text("rfc").notNull(),
  fechaNacimiento: timestamp("fecha_nacimiento").notNull(),
  direccion: text("direccion").notNull(),
  ciudad: text("ciudad").notNull(),
  estado: text("estado").notNull(),
  codigoPostal: text("codigo_postal").notNull(),
  status: text("status").notNull().default("pendiente"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTutorSchema = createInsertSchema(tutors, {
  edad: z.coerce.number().int().positive(),
  tarifa: z.coerce.number().int().positive(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  clabe: z.string().regex(/^\d{18}$/, "La CLABE debe tener exactamente 18 dígitos"),
  banco: z.string().min(1, "El nombre del banco es requerido"),
  rfc: z.string().regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, "RFC inválido (debe tener 12 o 13 caracteres)"),
  fechaNacimiento: z.coerce.date().refine((date) => {
    const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return age >= 18;
  }, "Debes ser mayor de 18 años"),
  direccion: z.string().min(1, "La dirección es requerida"),
  ciudad: z.string().min(1, "La ciudad es requerida"),
  estado: z.string().min(1, "El estado es requerido"),
  codigoPostal: z.string().regex(/^\d{5}$/, "El código postal debe tener 5 dígitos"),
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

export const resetTokens = pgTable("reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  userType: text("user_type").notNull(), // "tutor" or "alumno"
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertResetTokenSchema = createInsertSchema(resetTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertResetToken = z.infer<typeof insertResetTokenSchema>;
export type ResetToken = typeof resetTokens.$inferSelect;

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  email: text("email").notNull(),
  userType: text("user_type").notNull(), // "tutor", "alumno", o "otro"
  asunto: text("asunto").notNull(),
  mensaje: text("mensaje").notNull(),
  status: text("status").notNull().default("pendiente"), // "pendiente", "en_proceso", "resuelto"
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets, {
  email: z.string().email("Email inválido"),
  mensaje: z.string().min(10, "El mensaje debe tener al menos 10 caracteres"),
}).omit({
  id: true,
  createdAt: true,
  status: true,
});

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
