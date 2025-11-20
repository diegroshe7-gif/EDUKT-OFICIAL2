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
  - Core fields: nombre, edad, email, telefono, materias, modalidad, ubicacion, tarifa, disponibilidad
  - Integration fields: stripeAccountId, calLink, cvUrl, bio
  - Status tracking with createdAt timestamps
- `users` table: Simple authentication structure with username and password

**API Structure**
- POST `/api/tutors` - Create new tutor application
- GET `/api/tutors/approved` - Retrieve all approved tutors for student browsing
- GET `/api/tutors/pending` - Admin endpoint to view pending applications
- GET `/api/tutors/rejected` - Admin endpoint to view rejected applications
- PATCH `/api/tutors/:id/approve` - Admin endpoint to approve tutor
- PATCH `/api/tutors/:id/reject` - Admin endpoint to reject tutor
- POST `/api/stripe/webhook` - Stripe webhook handler for payment events
- POST `/api/payments/create-payment-intent` - Initialize payment flow

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

**Missing/Optional Integrations**
- No authentication system currently implemented (users table exists but unused)
- No session storage or JWT implementation
- No email notification service for tutor approval/rejection
- No real-time communication (could be added for tutor-student messaging)