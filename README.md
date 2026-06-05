# LegalFlow AI — Backend API

> NestJS REST API powering the LegalFlow AI legal intake platform.

## Live API

**Production**: https://legalflow-api.onrender.com  
**Health Check**: https://legalflow-api.onrender.com/api/health

---

## Problem

Small and medium-sized law firms receive dozens of client
inquiries every day. The initial intake process is:

- Time-consuming and repetitive
- Unstructured with no priority system
- Dependent on lawyer time for basic triage decisions

Lawyers spend valuable hours reading raw submissions to determine
what type of case it is, how urgent it is, and what information
is missing.

---

## Solution

LegalFlow AI acts as an intelligent first layer before human review.

When a client submits their case description, the system immediately:

1. Classifies the legal matter type
2. Assigns a priority level (LOW / MEDIUM / HIGH)
3. Generates a professional summary
4. Identifies missing information
5. Recommends a next action

Law firm staff receive structured, actionable summaries instead
of raw text submissions.

---

## Architecture

Browser (Public Form)
│
▼
Next.js Frontend (Vercel)
│ HTTPS REST API
▼
NestJS Backend (Render)
├── Auth Module → JWT authentication + RBAC
├── Cases Module → Intake management
├── AI Module → Gemini integration
├── Audit Module → Action logging
└── Dashboard Module → Metrics
│
┌────┴────┐
│ │
▼ ▼
PostgreSQL Gemini API
(Neon) (Google AI)

**Key Design Decisions:**

- **AI key never reaches browser** — Gemini calls happen server-side only
- **Case saved before AI analysis** — submissions never lost if AI fails
- **Structured JSON prompting** — reliable AI outputs, not free text parsing
- **Audit logs on every action** — legal compliance and accountability
- **Separate AI analysis table** — allows regeneration without data loss

## Tech Stack

| Layer     | Technology              |
| --------- | ----------------------- |
| Framework | NestJS 10 + TypeScript  |
| Database  | PostgreSQL (Neon)       |
| ORM       | Prisma 5                |
| Auth      | JWT + bcrypt            |
| AI        | Google Gemini 1.5 Flash |
| Hosting   | Render                  |

---

## Local Setup

### Prerequisites

- Node.js 20 LTS
- npm 10+
- PostgreSQL database (or Neon free tier)
- Google Gemini API key

### Installation

```bash
# Clone the repository
git clone https://github.com/YOURUSERNAME/legalflow-ai-api.git
cd legalflow-ai-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed demo data
npx prisma db seed

# Start development server
npm run start:dev

Environment Variables
# Application
NODE_ENV=development
PORT=3001

# Database - Get from neon.tech
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# JWT - Minimum 32 character secret
JWT_SECRET=your-secret-key-minimum-32-characters
JWT_EXPIRES_IN=24h

# Google Gemini - Get from aistudio.google.com
GEMINI_API_KEY=your-gemini-api-key

# CORS - Your frontend URL
FRONTEND_URL=http://localhost:3000

Demo Credentials
After running the seed script:



Admin:    admin@legalflow.com  / Admin1234!
Reviewer: sarah@legalflow.com  / Review1234!
API Reference
Base URL


Development: http://localhost:3001/api
Production:  https://legalflow-api.onrender.com/api
Authentication
All protected routes require:



Authorization: Bearer <jwt_token>
Endpoints
Method	Endpoint	Auth	Description
GET	/api/health	None	Health check
POST	/api/auth/register	None	Register staff user
POST	/api/auth/login	None	Login and get JWT
GET	/api/auth/me	JWT	Get current user
POST	/api/cases	None (public)	Submit intake form
GET	/api/cases	JWT	List cases with filters
GET	/api/cases/:id	JWT	Get case with AI analysis
PATCH	/api/cases/:id/status	JWT	Update case status
POST	/api/ai/analyze/:caseId	JWT + ADMIN	Re-run AI analysis
GET	/api/ai/analysis/:caseId	JWT	Get AI analysis
GET	/api/dashboard/metrics	JWT	Dashboard statistics
Example: Submit Intake
Bash

curl -X POST https://legalflow-api.onrender.com/api/cases \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "John Doe",
    "email": "john@example.com",
    "phone": "+12125551234",
    "description": "I was injured in a car accident three weeks ago and the insurance company is refusing to cover my medical expenses..."
  }'
Example: Login
Bash

curl -X POST https://legalflow-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@legalflow.com",
    "password": "Admin1234!"
  }'
Database Schema

users          → Staff accounts with roles
cases          → Client intake submissions
ai_analyses    → Gemini analysis results (1:1 with cases)
audit_logs     → Every significant action on a case
Full schema: prisma/schema.prisma

AI Prompt Design
The Gemini prompt enforces strict JSON output:



You are an experienced legal intake specialist.
Analyze the case description below.
Return ONLY a valid JSON object. No explanation.
No markdown. No extra text.

{
  "caseType": "Personal Injury | Family Law | ...",
  "priority": "LOW | MEDIUM | HIGH",
  "summary": "2-3 sentence summary",
  "missingInformation": ["item1", "item2"],
  "recommendedAction": "next step",
  "confidenceScore": 0.0 to 1.0
}
Why structured JSON? Free-text AI responses break in production.
Structured JSON outputs are deterministic and testable.

Project Structure


src/
├── auth/           JWT authentication + guards + RBAC
├── users/          User management service
├── cases/          Case intake and management
├── ai/             Gemini integration and analysis
├── audit-logs/     Case action logging
├── dashboard/      Metrics aggregation
├── health/         Health check endpoint
├── prisma/         Database service
└── common/         Shared decorators, filters, interceptors
Scripts
Bash

npm run start:dev      # Development server with hot reload
npm run build          # Production build
npm run start:prod     # Production server
npm run lint           # ESLint check
npm run db:migrate     # Run database migrations
npm run db:seed        # Seed demo data
npm run db:studio      # Open Prisma Studio
Security
Passwords hashed with bcrypt (10 salt rounds)
JWT tokens expire after 24 hours
Role-based access control (ADMIN / REVIEWER)
Gemini API key server-side only, never exposed
Input validation on all endpoints via class-validator
CORS restricted to known frontend origin
Future Improvements
Feature	Description
Background Queue	Move AI analysis to Bull/Redis queue
Rate Limiting	Throttle public intake endpoint
Email Notifications	SendGrid alerts for high priority cases
Document Upload	S3 + OCR for supporting documents
Multi-firm Support	Tenant isolation for multiple firms
Refresh Tokens	Longer sessions with token rotation
WebSockets	Real-time case updates for staff
Author
Yohannis Lema
GitHub https://github.com/jonny-grace
LinkedIn https://github.com/jonny-grace
```
