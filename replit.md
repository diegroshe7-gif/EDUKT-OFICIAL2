# EDUKT Tutoring Platform

## Overview

EDUKT is a tutoring marketplace platform designed to connect students with qualified tutors. It features three distinct user portals for students, tutors, and administrators, managing the entire tutoring lifecycle from registration and approval to session scheduling and payment processing. The platform aims to provide a trusted and efficient environment for online tutoring, inspired by successful marketplace models like Airbnb and Upwork.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework:** React 18 with TypeScript.
- **Build Tool:** Vite, configured with HMR.
- **Routing:** Wouter for client-side routing.
- **UI:** shadcn/ui component library built on Radix UI, styled with Tailwind CSS.
- **Design System:** Custom guidelines (`design_guidelines.md`) with specific typography and spacing, featuring Framer Motion for animations.
- **State Management:** TanStack Query for server state and caching; React's `useState` for UI state.
- **Design Philosophy:** Responsive, mobile-first design emphasizing credibility and trust through clean, professional aesthetics and interactive elements. Three-role system (Student, Tutor, Admin) accessed from a central landing page.

### Backend

- **Server:** Express.js with TypeScript, Node.js runtime.
- **API:** RESTful architecture, `/api` prefix, custom middleware for logging and JSON parsing.
- **Database:** Neon serverless PostgreSQL, accessed via Drizzle ORM for type-safe interactions. Uses a schema-first approach with shared type definitions.
- **Database Schema:**
    - `tutors`: Stores tutor profiles with an approval workflow. Includes personal info, professional details, KYC data (date of birth, full address), banking information (CLABE, RFC, bank name), and Stripe Connect account ID.
    - `alumnos`: Student registration.
    - `sesiones`: Scheduled tutoring sessions, linked to tutors and students, with payment intent IDs for idempotency.
    - `reviews`: Student ratings and feedback for tutors.
    - `availability_slots`: Stores tutors' recurring weekly availability.
    - `users`: Simple authentication (currently unused).
- **API Endpoints:** Comprehensive set of endpoints for tutor, student, admin, session, review, and availability management, including payment initiation and confirmation.
- **Key Decisions:** Separation of concerns (`/client`, `/server`, `/shared`), shared schema definitions, Zod validation (client/server), storage abstraction, and environment-based configuration.
- **Security:** HMAC-SHA256 signed booking tokens for payment security, 24-hour token expiration, and idempotent session creation using unique `paymentIntentId`. Authentication is password-based with bcrypt hashing; however, server-side student authentication (JWT/sessions) is noted as a future enhancement for production.
- **Current Features:** Implemented user roles and authentication, tutor approval workflow with KYC verification, student registration, tutor search/filtering, Stripe payment processing with 8% service fee, automatic session creation, enhanced tutor profiles, tutor availability system, teacher calendar, post-class rating system, financial reporting, and Stripe Connect Custom accounts for automatic payouts to tutors in Mexico.

## External Dependencies

- **Payment Processing:** Stripe (Stripe Connect Custom accounts for automatic payouts, Payment Intents API for collection). Uses `@stripe/stripe-js`, `@stripe/react-stripe-js` (frontend) and `stripe` SDK (backend). Platform collects 8% service fee, tutors receive 92% automatically via Stripe Connect transfers to their Mexican bank accounts.
- **Database:** Neon Serverless PostgreSQL (`DATABASE_URL`). Utilizes `@neondatabase/serverless` for WebSocket-based connections.
- **Scheduling Integration:** Google Calendar API for automated Meet link generation and calendar event creation.
- **File Storage:** No built-in file upload; `cvUrl` fields assume external storage.
- **Development Tools:** Replit-specific plugins (e.g., Cartographer, Dev banner).
- **Third-Party UI Libraries:** Lucide React (icons), Radix UI (primitives), React Hook Form with Zod, date-fns, cmdk, vaul.