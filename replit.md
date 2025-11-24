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
    - `support_tickets`: Support/help tickets from users with nombre, email, user_type, asunto, mensaje, and status.
    - `users`: Simple authentication (currently unused).
- **API Endpoints:** Comprehensive set of endpoints for tutor, student, admin, session, review, and availability management, including payment initiation and confirmation.
- **Key Decisions:** Separation of concerns (`/client`, `/server`, `/shared`), shared schema definitions, Zod validation (client/server), storage abstraction, and environment-based configuration.
- **Security:** HMAC-SHA256 signed booking tokens for payment security, 24-hour token expiration, and idempotent session creation using unique `paymentIntentId`. Authentication is password-based with bcrypt hashing; however, server-side student authentication (JWT/sessions) is noted as a future enhancement for production.
- **Current Features:** Implemented user roles and authentication, tutor approval workflow with KYC verification, student registration, tutor search/filtering, Stripe payment processing with 8% service fee, automatic session creation, enhanced tutor profiles, tutor availability system, teacher calendar, post-class rating system, financial reporting, Stripe Connect Custom accounts for automatic payouts to tutors in Mexico, file upload functionality with drag & drop support for profile photos and CV documents, password reset system with token-based authentication (1-hour expiration), and integrated support ticket system with floating help widget accessible from all pages.
- **Email System:** All system emails are sent from notificationsedukt@gmail.com using the Gmail API (google-mail connector). Five email types:
  - **Password Reset:** Token-based system with 1-hour expiration, stored in `reset_tokens` table. Sends formatted HTML emails with reset codes to tutors and students.
  - **Class Invitations:** Automated emails sent to both tutor and student when a class is booked. Includes class details, Google Meet link, formatted date/time, and calendar event information. Emails sent via Gmail API instead of Calendar API for consistent branding.
  - **Support Tickets:** When users submit tickets via the floating help widget, emails are sent to notificationsedukt@gmail.com with user details, ticket type, subject, and message. Tickets are also saved to the `support_tickets` database table.
  - **Tutor Approval:** When admin approves a tutor, automated welcome email is sent with next steps, platform guidelines, and payment information (92% payout details).
  - **Tutor Rejection:** When admin rejects a tutor application, polite email is sent explaining that requirements weren't met, providing guidance on what to improve, and encouraging reapplication.
- **File Upload System:** Integrated Replit App Storage with Google Cloud Storage backend for handling file uploads. Tutor registration form features file uploading for profile photos (up to 5MB, image formats) and CV documents (up to 10MB, PDF/Word formats) using simple file input with click-to-upload button. **Security by convention**: Files uploaded via `/api/objects/upload` are stored in public directories (PUBLIC_OBJECT_SEARCH_PATHS) and served without authentication via `/objects/:path` endpoint. Server returns presigned URLs for direct-to-storage uploads. Features include click-to-upload button, file type/size validation, real-time progress tracking with XMLHttpRequest, and toast notifications for upload status.
- **Support System:** Integrated floating help widget (SupportWidget component) accessible from all pages. Users can submit support tickets by filling out a form with their name, email, user type (alumno, tutor, admin, otro), subject, and message (minimum 10 characters). The system validates input client-side and server-side, saves tickets to database, and sends email notifications to notificationsedukt@gmail.com. Displays clear success confirmation and error messages. Enhanced error handling across all forms to show user-friendly messages for common issues like duplicate emails.
- **Error Handling:** Comprehensive error handling across the platform with user-friendly messages. Backend returns specific error messages for validation failures and database constraint violations (e.g., duplicate emails show "Este correo ya está registrado"). Frontend properly captures and displays backend error messages in toast notifications.

## External Dependencies

- **Payment Processing:** Stripe (Stripe Connect Custom accounts for automatic payouts, Payment Intents API for collection). Uses `@stripe/stripe-js`, `@stripe/react-stripe-js` (frontend) and `stripe` SDK (backend). Platform collects 8% service fee, tutors receive 92% automatically via Stripe Connect transfers to their Mexican bank accounts.
- **Database:** Neon Serverless PostgreSQL (`DATABASE_URL`). Utilizes `@neondatabase/serverless` for WebSocket-based connections.
- **Scheduling Integration:** Google Calendar API for automated Meet link generation and calendar event creation. Gmail API (google-mail connector) for sending class invitation emails from notificationsedukt@gmail.com.
- **File Storage:** Replit App Storage (Google Cloud Storage backend) for profile photos and CV documents. Uses `@google-cloud/storage` for server-side operations. ObjectUploader component provides simple file input with click-to-upload button, file type/size validation, and XMLHttpRequest-based direct uploads to presigned URLs. Security model: files in public directories (PUBLIC_OBJECT_SEARCH_PATHS) are accessible without authentication; private directory reserved for future authenticated features. Environment variables: `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`.
- **Development Tools:** Replit-specific plugins (e.g., Cartographer, Dev banner).
- **Third-Party UI Libraries:** Lucide React (icons), Radix UI (primitives), React Hook Form with Zod, date-fns, cmdk, vaul, Uppy (file uploads).