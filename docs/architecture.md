# LegalFlow AI — System Architecture

## Overview

LegalFlow AI is a full-stack AI-powered legal intake and triage platform.

The system accepts client case submissions through a public form,
processes them using Google Gemini AI, and presents structured
triage results to law firm staff through a protected dashboard.

The platform acts as an intelligent first layer before any human
review, saving lawyers time and ensuring urgent cases are never missed.

---

## Architecture Principles

### 1. Separation of Concerns

Each layer of the system has exactly one responsibility.

- Frontend: Presentation and user interaction only
- Backend: Business logic, validation, orchestration
- AI Service: Legal analysis only
- Database: Persistence only

No layer reaches into another layer's responsibility.

### 2. Security by Default

- AI API keys are stored only in backend environment variables
- They never appear in frontend code, API responses, or logs
- All staff routes require JWT authentication
- Passwords are hashed with bcrypt before storage
- Role-based access controls what each user can do

### 3. Structured AI Outputs

Instead of parsing free-text AI responses (which breaks in production),
we instruct Gemini to return strict JSON schema outputs.

This makes AI integration:

- Deterministic
- Testable
- Reliable under load

### 4. Audit Trail by Design

Every significant action on a case is logged to an audit table.

This is not optional in a legal context.
Firms need to know who changed what and when.
The audit log enables compliance, accountability, and dispute resolution.

### 5. Graceful AI Failure

If Gemini is unavailable or returns an unexpected response:

- The case is still saved successfully
- The AI analysis is marked as pending
- Staff are notified to review manually
- The system never loses a client submission

---

## System Diagram

┌─────────────────────────────────────────────────────────────┐
│ CLIENT BROWSER │
│ │
│ ┌──────────────────┐ ┌────────────────────────┐ │
│ │ Public Intake │ │ Staff Dashboard │ │
│ │ Form │ │ (JWT Protected) │ │
│ │ / │ │ /portal/dashboard │ │
│ └────────┬─────────┘ └───────────┬────────────┘ │
└────────────┼──────────────────────────────┼────────────────┘
│ │
▼ ▼
┌─────────────────────────────────────────────────────────────┐
│ NEXT.JS FRONTEND │
│ Vercel Edge Network │
│ │
│ React Hook Form Zod Validation TanStack Query │
│ shadcn/ui TypeScript Axios HTTP Client │
└──────────────────────────────┬──────────────────────────────┘
│
│ HTTPS REST API Calls
│
▼
┌─────────────────────────────────────────────────────────────┐
│ NESTJS BACKEND │
│ Render.com │
│ │
│ ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐ │
│ │ Auth │ │ Cases │ │ AI │ │ Audit │ │
│ │ Module │ │ Module │ │ Module │ │ Module │ │
│ └───────────┘ └───────────┘ └──────────┘ └──────────┘ │
│ │
│ ┌───────────┐ ┌───────────────────────────────────────┐ │
│ │ Dashboard│ │ Prisma ORM Layer │ │
│ │ Module │ │ Type-safe database access │ │
│ └───────────┘ └──────────────────┬────────────────────┘ │
└─────────────────────────────────────┼───────────────────────┘
│
┌─────────────────┼─────────────────┐
│ │ │
▼ │ ▼
┌────────────────────┐ │ ┌────────────────────┐
│ POSTGRESQL │ │ │ GEMINI API │
│ Neon.tech │ │ │ Google AI │
│ │ │ │ │
│ users │ │ │ Receives case │
│ cases │ │ │ description │
│ ai_analyses │ │ │ │
│ audit_logs │ │ │ Returns strict │
│ │ │ │ JSON analysis │
└────────────────────┘ │ └────────────────────┘
│
(AI key stored
server-side only.
Never sent to browser.)

---

## Technology Decisions

### Backend: NestJS

**Decision**: Use NestJS over Express.js or Fastify.

**Reasoning**:

NestJS provides a strongly opinionated, modular architecture
that enforces good practices by convention rather than discipline.

For a legal intake platform where security, validation, and
role-based access matter, having these built into the framework
prevents entire categories of mistakes.

Specific benefits:

- Decorator-based validation at the route level
- Built-in dependency injection for testability
- Module system enforces separation of concerns
- First-class TypeScript support
- Guards and interceptors for cross-cutting concerns

**Alternative considered**: Express.js
**Reason rejected**: Too unstructured. Requires manual setup of
everything NestJS provides by convention. Inconsistency accumulates
as the codebase grows.

---

### Frontend: Next.js 15

**Decision**: Use Next.js App Router over Create React App or Vite.

**Reasoning**:

The application has both public routes (intake form) and
protected routes (staff dashboard). Next.js App Router handles
this elegantly with route groups and layouts.

Server components reduce client-side JavaScript for public pages.
File-based routing keeps the codebase organized.
Vercel deployment is zero-configuration.

---

### ORM: Prisma

**Decision**: Use Prisma over TypeORM or raw SQL.

**Reasoning**:

Type-safe database access prevents entire categories of runtime
errors. When you query a case, TypeScript knows exactly what
fields are available.

Prisma migrations create a clear, versioned history of schema
changes. For a legal platform where data integrity is critical,
this auditability matters.

The Prisma schema file serves as living documentation of the
database structure.

---

### AI: Google Gemini

**Decision**: Use Gemini API with structured JSON prompting.

**Reasoning**:

Gemini provides strong reasoning capabilities for analyzing
legal text. The structured JSON output mode allows us to
build deterministic integrations rather than fragile
text-parsing logic.

**Critical design choice**: We never ask Gemini to respond in
natural language and then parse it. We instruct it to return
strict JSON matching our schema. This is the difference between
a demo that works once and a system that works reliably.

---

### Authentication: JWT

**Decision**: Stateless JWT over sessions.

**Reasoning**:

With a separate frontend and backend deployment, stateless
JWT tokens avoid the need for shared session storage.
Tokens carry the user role, eliminating a database round-trip
on every request.

---

## AI Analysis Workflow

Client submits intake form
│
▼

NestJS validates input (DTO validation)
│
▼

Case record saved to PostgreSQL
status: NEW
│
▼

Gemini receives structured prompt:

"You are a legal intake assistant.
Analyze the following case description.
Return ONLY valid JSON in this exact format:
{
caseType: string,
priority: LOW | MEDIUM | HIGH,
summary: string,
missingInformation: string[],
recommendedAction: string
}"
│
▼

Gemini returns JSON analysis
│
▼

Analysis validated and saved to ai_analyses table
linked to case by caseId
│
▼

AuditLog entry created:
action: CASE_CREATED
│
▼

Response returned to client with case ID
│
▼

Staff views case in dashboard with full AI analysis

## Security Architecture

### API Key Protection

❌ WRONG (exposes key to browser):
Frontend → Gemini API directly

✅ CORRECT (key never leaves server):
Frontend → NestJS Backend → Gemini API

The Gemini API key exists only in:

- Backend .env file (local development)
- Render environment variables (production)

It never appears in:

- Any frontend code
- Any API response
- Any git commit
- Any log file

### Authentication Flow

Staff submits email + password to POST /api/auth/login
Backend finds user by email
bcrypt.compare() validates password against stored hash
JWT signed with secret: { sub: userId, role: userRole }
Token returned to frontend (24 hour expiry)
Frontend stores token and sends on every request:
Authorization: Bearer <token>
JwtAuthGuard validates token on every protected route
RolesGuard checks token payload role against @Roles() decorator
text

### Role Hierarchy

ADMIN
├── View all cases
├── Update case status
├── Manage user accounts
├── Re-run AI analysis
└── View audit logs

REVIEWER
├── View all cases
└── Update case status

## Scalability Path

This demo is built for a single firm. Here is how it would
scale to a production system:

### Phase 2: Background Processing

AI analysis moves to a Bull queue with Redis.
Submissions return immediately.
Analysis runs asynchronously.
Staff notified when analysis completes.

### Phase 3: Multi-tenancy

Firm model added to schema.
All queries scoped to firmId.
Each firm has isolated data.

### Phase 4: Document Processing

S3 bucket for file uploads.
Textract for OCR on uploaded documents.
AI analyzes both text submission and documents.

### Phase 5: Notifications

SendGrid integration for email notifications.
Staff alerted on new high-priority cases.
Clients receive submission confirmation.

### Phase 6: Analytics

Aggregated reporting per firm.
Case resolution time tracking.
AI accuracy feedback loop.
