# EDUKT Tutoring Platform

## Overview

EDUKT is a tutoring marketplace platform that connects students with qualified tutors. The platform provides three distinct user portals: students can browse and book sessions with approved tutors, tutors can register and create their profiles, and administrators can review and approve tutor applications. The system handles the complete tutoring lifecycle from tutor registration through payment processing and session scheduling.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript as the primary UI framework
- Vite as the build tool and development server, configured with HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing
- Single-page application (SPA) architecture with component-based design

**UI Component System**
- shadcn/ui component library built on Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling with custom design tokens
- Custom design system defined in `design_guidelines.md` with specific typography (Inter for UI, Sora for headings) and spacing guidelines
- Framer Motion for animations and transitions
- Component examples directory (`client/src/components/examples/`) for development and testing

**State Management**
- TanStack Query (React Query) for server state management, caching, and data fetching
- Local React state (useState) for UI state within components
- Query invalidation pattern for keeping data fresh after mutations

**Key Design Decisions**
- Design inspired by Airbnb's marketplace trust patterns and Upwork's service provider profiles
- Emphasis on credibility and trust through clean, professional design
- Responsive design with mobile-first approach
- Hover elevation effects for interactive elements
- Three-role system (Student, Tutor, Admin) accessed from a central landing page

### Backend Architecture

**Server Framework**
- Express.js server with TypeScript
- Node.js runtime environment
- RESTful API architecture with `/api` prefix for all endpoints
- Custom middleware for request logging and JSON parsing with raw body preservation (for webhook verification)

**Database Layer**
- Drizzle ORM for type-safe database interactions
- Neon serverless PostgreSQL as the database provider
- WebSocket connection pooling for database connections
- Schema-first approach with shared type definitions between client and server

**Database Schema**
- `tutors` table: Stores tutor profiles with status workflow (pendiente → aprobado/rechazado)
  - Core fields: nombre, edad, email, password (bcrypt hashed), telefono, materias, modalidad, ubicacion, tarifa, disponibilidad
  - Integration fields: stripeAccountId, calLink, cvUrl, bio, universidad, fotoPerfil
  - Status tracking with createdAt timestamps
  - Tutors must be approved before accessing portal
- `alumnos` table: Student registration system
  - Fields: nombre, apellido, edad, email, password (bcrypt hashed)
  - Students can access portal immediately after registration
  - Session data stored in localStorage on client-side
- `sesiones` table: Scheduled tutoring sessions
  - Links tutors to students with booking details
  - Fields: tutorId, alumnoId, fecha, horas, zoomLink, googleCalendarEventId, paymentIntentId, status
  - paymentIntentId: NOT NULL, UNIQUE - used for idempotent session creation
  - Created automatically after successful payment verification
  - Status tracking (default: "pendiente")
- `reviews` table: Student ratings and feedback for tutors
  - Fields: tutorId, alumnoId, calificacion (0-5), comentario
  - Allows students to rate completed sessions
- `users` table: Simple authentication structure with username and password (currently unused)

**API Structure**
- Tutor endpoints:
  - POST `/api/tutors` - Create new tutor application (hashes password, returns without password field)
  - POST `/api/tutors/login` - Tutor login with email and password (verifies bcrypt hash)
  - GET `/api/tutors/approved` - Retrieve all approved tutors for student browsing
  - GET `/api/tutors/pending` - Admin endpoint to view pending applications
  - GET `/api/tutors/rejected` - Admin endpoint to view rejected applications
  - PATCH `/api/tutors/:id/approve` - Admin endpoint to approve tutor
  - PATCH `/api/tutors/:id/reject` - Admin endpoint to reject tutor
- Alumno (student) endpoints:
  - POST `/api/alumnos` - Register new student (hashes password, returns without password field)
  - POST `/api/alumnos/login` - Student login with email and password (verifies bcrypt hash)
  - GET `/api/alumnos/:id` - Retrieve student by ID (password excluded from response)
- Admin endpoints:
  - POST `/api/admin/login` - Admin login with username "diegovictor778" and password from ADMINISTRADOR_KEY secret
- Session endpoints:
  - POST `/api/sesiones` - Create new session (internal use)
  - GET `/api/sesiones/tutor/:tutorId` - Get all sessions for a tutor
  - GET `/api/sesiones/alumno/:alumnoId` - Get all sessions for a student
- Review endpoints:
  - POST `/api/reviews` - Create new review
  - GET `/api/reviews/tutor/:tutorId` - Get all reviews for a tutor
- Payment endpoints:
  - POST `/api/create-payment-intent` - Initialize payment flow
    - Validates alumno and tutor existence and status
    - Creates Stripe payment intent with metadata (tutorId, alumnoId, hours)
    - Generates HMAC-signed booking token binding payment to specific student/tutor
    - Returns: clientSecret, bookingToken, amount breakdown
  - POST `/api/confirm-session` - Verify payment and create session
    - Requires: paymentIntentId, bookingToken, alumnoId, tutorId
    - Validates booking token signature and expiration
    - Retrieves payment from Stripe and verifies status = "succeeded"
    - Cross-validates provided IDs against Stripe metadata
    - Checks for existing session by paymentIntentId (idempotency)
    - Creates session record with paymentIntentId for deduplication

**Key Architectural Decisions**
- Separation of concerns with distinct `/client`, `/server`, and `/shared` directories
- Shared schema definitions between frontend and backend prevent type mismatches
- Zod validation on both client (form validation) and server (API validation)
- Storage abstraction layer (`IStorage` interface) allows for potential database switching
- Environment-based configuration for development vs. production

### External Dependencies

**Payment Processing**
- Stripe integration for payment processing
  - Stripe Connect for tutor payouts (stored as `stripeAccountId`)
  - Payment Intents API for secure payment collection
  - Webhook handling for payment event verification (uses raw body parsing)
  - Frontend: `@stripe/stripe-js` and `@stripe/react-stripe-js`
  - Backend: `stripe` SDK with API version "2025-10-29.clover"
  - Requires `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLIC_KEY` environment variables

**Database**
- Neon Serverless PostgreSQL
  - Requires `DATABASE_URL` environment variable
  - WebSocket-based connections using `ws` package
  - Connection pooling via `@neondatabase/serverless`

**Scheduling Integration**
- Cal.com integration for session scheduling
  - Tutors provide `calLink` for direct booking
  - External service, no backend integration required
  - Links open in new tab for booking flow

**File Storage**
- CV/Resume uploads referenced by URL (`cvUrl` field)
- No built-in file upload handler - expects external storage solution or future implementation

**Development Tools**
- Replit-specific plugins for development environment
  - Runtime error modal overlay
  - Cartographer for code navigation
  - Dev banner for environment indicators
  - Conditional loading only in development mode

**Third-Party UI Libraries**
- Lucide React for icon components
- Radix UI primitives for accessible component foundations
- React Hook Form with Zod resolvers for form management
- date-fns for date manipulation
- cmdk for command palette functionality
- vaul for drawer components

**Current Features & Implementation Status**
- ✅ Three-role system (Student, Tutor, Admin) with password-based authentication
- ✅ Secure password authentication using bcrypt (12 rounds) for all roles
- ✅ Login endpoints for students, tutors, and admin with credential verification
- ✅ Tutor approval workflow (pending → approved/rejected) - tutors must be approved before portal access
- ✅ Student registration and login with immediate portal access
- ✅ Admin login using username "diegovictor778" with password from ADMINISTRADOR_KEY secret
- ✅ Tutor search and filtering by name, subject, and modality
- ✅ Stripe payment processing with 8% service fee
- ✅ Automatic session creation after successful payment
- ✅ Enhanced tutor profiles with university and optional photo
- 🔄 Google Calendar integration (connector available, not yet configured)
- 🔄 Zoom integration for automated meeting links (no native connector available)
- ⏳ Teacher calendar view showing scheduled sessions
- ⏳ Post-class rating system (0-5 stars) with comments
- ⏳ Display of ratings/reviews on tutor profiles

**Security Implementation & Limitations**

*Payment Security (November 2025)*
- **Booking Token System**: HMAC-SHA256 signed tokens bind payment intents to specific student/tutor pairs
  - Token format: `paymentIntentId:alumnoId:tutorId:timestamp:signature`
  - 24-hour expiration window
  - Server validates token signature and verifies IDs against Stripe metadata
  - Prevents unauthorized session creation with leaked payment IDs
- **Payment Verification Flow**:
  1. `/api/create-payment-intent` validates student and tutor, creates Stripe payment, generates signed booking token
  2. Client stores token and completes payment with Stripe
  3. `/api/confirm-session` validates token, verifies payment with Stripe, cross-checks IDs against trusted Stripe metadata
  4. Session created with `paymentIntentId` (NOT NULL, UNIQUE) for idempotent deduplication
- **Security Measures**:
  - ✅ HMAC-signed tokens prevent forgery
  - ✅ Cross-validation against Stripe metadata prevents ID manipulation
  - ✅ O(1) deduplication using unique `paymentIntentId` column
  - ✅ Token expiration limits replay window
  - ✅ Normalized error messages prevent information leakage
  - ⚠️ **Limitation**: Without server-side student authentication (JWT/sessions), intercepted tokens can still be replayed within 24h window
  - ⚠️ **Limitation**: No single-use token enforcement (tokens not marked as consumed server-side)

*Authentication*
- **No server-side authentication**: Student authentication uses localStorage only
- Tutor/student identity validated at payment creation, not at session confirmation
- Current implementation suitable for MVP/demo/educational purposes
- **Production requirements**: Implement JWT or session-based authentication to fully prevent token replay attacks

*Deduplication*
- ✅ Sessions keyed by unique `paymentIntentId` to prevent double-charging
- Database constraint prevents duplicate sessions for same payment

**Missing/Optional Integrations**
- No email notification service for tutor approval/rejection or booking confirmations
- No real-time communication (could be added for tutor-student messaging)
- No automated calendar invitations (Google Calendar connector available but not configured)
- No automated Zoom meeting creation (requires manual API integration)