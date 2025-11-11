# EDUKT Tutoring Platform - Design Guidelines

## Design Approach
**Reference-Based with System Foundation**: Drawing inspiration from Airbnb's marketplace trust patterns, Upwork's service provider profiles, and LinkedIn's professional presentation, combined with Material Design's form patterns for administrative workflows.

**Core Principle**: Build credibility and trust through clean, professional design that emphasizes tutor qualifications while maintaining approachability for students.

---

## Typography System

**Font Stack**: 
- Primary: Inter (Google Fonts) - for UI, forms, body text
- Accent: Sora (Google Fonts) - for headings, brand elements

**Hierarchy**:
- Hero/Landing Title: text-5xl md:text-6xl font-bold (Sora)
- Section Headings: text-3xl md:text-4xl font-bold (Sora)
- Card Titles: text-xl font-semibold (Inter)
- Body Text: text-base leading-relaxed (Inter)
- Captions/Meta: text-sm text-slate-600 (Inter)

---

## Layout & Spacing

**Spacing Scale**: Use Tailwind units of **4, 6, 8, 12, 16, 20, 24** for consistent rhythm
- Component padding: p-6 to p-8
- Section vertical spacing: py-16 to py-24
- Card spacing: gap-6 to gap-8
- Form field spacing: gap-4

**Container Strategy**:
- Landing page: Full-width sections with max-w-7xl inner containers
- Forms: max-w-2xl centered
- Admin panels: max-w-6xl with sidebar layout
- Tutor cards grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6

---

## Component Library

### Landing Page
**Hero Section** (60vh minimum):
- Centered logo (h-24 to h-32)
- Bold headline with EDUKT branding
- Descriptive tagline
- Three prominent role-selection cards in a row (md:flex-row layout)
- Subtle gradient background treatment

**Role Selection Cards**:
- Equal width cards with icons
- Clear labels: "Soy Estudiante", "Quiero Enseñar", "Administrador"
- Hover elevation effect
- Icons from Heroicons (Academic Cap, Users, Shield)

### Tutor Registration Form
**Layout**: Single column, stepped progression
- Clear section headers with icons
- Input fields: rounded-xl border with focus ring
- Multi-column grid for related fields (2 columns on md+)
- File upload area with drag-and-drop visual
- Progress indicator showing form completion
- Sticky submit button bar at bottom

**Field Groups**:
1. Personal Info (name, age, contact)
2. Teaching Details (subjects, modality, location)
3. Rates & Availability (hourly rate, schedule)
4. Credentials (CV upload, bio, certifications)
5. Payment & Booking (Stripe ID, Cal.com link)

### Student Portal
**Tutor Grid Layout**:
- Masonry-style or equal-height cards
- Each card includes:
  - Profile image placeholder (rounded-lg, aspect-square)
  - Name and subjects (prominent)
  - Rate display (large, emphasized)
  - Modality badges (pill-shaped)
  - Location (if presential/mixed)
  - Availability snippet
  - "Ver Perfil" and "Agendar Clase" buttons

**Filtering Sidebar** (desktop) / Collapsible (mobile):
- Subject checkboxes
- Modality radio buttons
- Price range slider
- Location search (for presential)
- Clear filters button

**Tutor Detail Modal/Page**:
- Large profile section
- Full bio with formatted text
- Subject tags
- Detailed availability calendar view
- Contact information (with privacy controls)
- CV download button
- Prominent booking CTA with Cal.com integration
- Payment breakdown showing rate + 15% service fee

### Admin Panel
**Dashboard Layout**: 
- Left sidebar navigation (Pendientes, Aprobados, Rechazados, Estadísticas)
- Main content area with tabs
- Stats cards at top (pending count, approval rate, total tutors)

**Review Queue**:
- List view with expandable cards
- Each pending tutor shows:
  - Quick-view info panel
  - CV preview/link
  - Approve/Reject action buttons (green/red)
  - Notes/comments field
- Batch actions for multiple selections

**Approved Tutors List**:
- Data table with sorting/filtering
- Status indicators
- Quick actions menu per row

---

## Form Elements
**Input Fields**: 
- rounded-xl borders with focus:ring treatment
- Consistent height (h-11 to h-12)
- Placeholder text with clear labels above
- Error states with inline validation messages

**Buttons**:
- Primary: Solid fill, rounded-xl, font-semibold, px-6 py-3
- Secondary: Border style with transparent background
- Icon buttons: Square with icon centered
- Disabled states: opacity-50 cursor-not-allowed

**Select Dropdowns**: Match input styling with chevron icon

**Textareas**: min-h-32, resize-y enabled

---

## Cards & Containers
**Tutor Cards**:
- rounded-2xl with subtle shadow (shadow-md hover:shadow-xl transition)
- Padding: p-6
- Image at top or left (responsive)
- Content hierarchy: name → subjects → rate → availability
- Badge clusters for tags
- Action buttons at bottom with full-width on mobile

**Status Badges**:
- Pill-shaped (rounded-full)
- Padding: px-3 py-1
- States: Pendiente (yellow), Aprobado (green), Rechazado (red)

---

## Navigation
**Top Bar** (when logged in):
- EDUKT logo left
- Navigation links center
- User profile/logout right
- Sticky positioning (sticky top-0)
- Shadow on scroll

**Footer**: 
- Three-column layout (About, Resources, Contact)
- Social media icons
- Copyright and legal links
- Newsletter signup form

---

## Images
**Logo**: Place EDUKT logo prominently on landing hero - centered, h-24 to h-32
**Tutor Profiles**: Circular or rounded-square headshots (aspect-square, object-cover)
**Empty States**: Illustrations for "No tutors found", "Pending review", etc.
**Hero Background**: Subtle abstract education-themed pattern or gradient

---

## Interaction Patterns
- Smooth transitions (transition-all duration-300)
- Card hover effects (lift with shadow increase)
- Modal overlays with backdrop blur
- Toast notifications for actions (approval/rejection/booking confirmations)
- Loading states with skeleton screens for async data
- Minimal animations - use sparingly for feedback only

---

## Responsive Breakpoints
- Mobile-first approach
- md: 768px (2-column grids, horizontal layouts)
- lg: 1024px (3-column grids, sidebar reveals)
- xl: 1280px (max content width expansion)