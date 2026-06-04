# LegalFlow AI — Database Design

## Technology

- Database: PostgreSQL
- Hosting: Neon (serverless PostgreSQL)
- ORM: Prisma
- Version Control: Prisma Migrations

---

## Design Principles

### Use UUIDs for Primary Keys

Sequential integer IDs expose record counts to anyone
who can see a URL. UUID primary keys are unguessable
and safe to expose publicly.

Example of the problem with integers:
GET /cases/1 ← attacker knows this is the first case
GET /cases/847 ← attacker knows you have roughly 847 cases

With UUIDs:
GET /cases/clh3k2j4k0000pb4k2j3k4k5k ← reveals nothing

### Separate AI Analysis from Case Data

Case data and AI analysis have different lifecycles.

A case is created once and its core data rarely changes.
AI analysis can be regenerated multiple times as the
system improves or as new information is added.

Keeping them in separate tables means we can:

- Re-run analysis without touching the original record
- Version AI analyses over time
- Query cases without loading heavy analysis data

### Audit Logs as First-Class Citizens

In a legal context, the audit trail is not an afterthought.
It is a core requirement.

Every status change must be attributed to a specific user
with a timestamp. This table is append-only in practice.
We never update or delete audit log rows.

---

## Entity Relationship Diagram

┌─────────────────────┐
│ users │
├─────────────────────┤
│ id UUID PK │
│ name String │
│ email String │◄──────────────────┐
│ password String │ │
│ role Enum │ │
│ createdAt DateTime│ │
│ updatedAt DateTime│ │
└─────────────────────┘ │
│
┌─────────────────────┐ │
│ cases │ │
├─────────────────────┤ │
│ id UUID PK │◄──────────────┐ │
│ clientName String │ │ │
│ email String │ │ │
│ phone String? │ │ │
│ description Text │ │ │
│ status Enum │ │ │
│ createdAt DateTime│ │ │
│ updatedAt DateTime│ │ │
└─────────────────────┘ │ │
│ │ │
│ 1:1 │ │
▼ │ │
┌─────────────────────┐ │ │
│ ai_analyses │ │ │
├─────────────────────┤ │ │
│ id UUID PK│ │ │
│ caseId UUID FK│───────────────┘ │
│ caseType String │ │ │
│ priority Enum │ │ │
│ summary Text │ │ │
│ missingInfo String[] │ │
│ recommended Text │ │ │
│ confidence Float? │ │ │
│ createdAt DateTime │ │
└─────────────────────┘ │ │
│ │
┌─────────────────────┐ │ │
│ audit_logs │ │ │
├─────────────────────┤ │ │
│ id UUID PK │ │ │
│ caseId UUID FK │───────────────┘ │
│ userId UUID FK │───────────────────┘
│ action String │
│ metadata Json? │
│ createdAt DateTime│
└─────────────────────┘

## Table Specifications

### Table: users

| Column    | Type     | Constraint       | Description                  |
| --------- | -------- | ---------------- | ---------------------------- |
| id        | String   | PK, cuid()       | Unique identifier            |
| name      | String   | NOT NULL         | Full display name            |
| email     | String   | NOT NULL, UNIQUE | Login identifier             |
| password  | String   | NOT NULL         | bcrypt hash, never plaintext |
| role      | Role     | DEFAULT REVIEWER | ADMIN or REVIEWER            |
| createdAt | DateTime | DEFAULT now()    | Auto-set on creation         |
| updatedAt | DateTime | AUTO             | Auto-updated by Prisma       |

**Enum: Role**
ADMIN
REVIEWER

### Table: cases

| Column      | Type     | Constraint    | Description                      |
| ----------- | -------- | ------------- | -------------------------------- |
| id          | String   | PK, cuid()    | Unique identifier                |
| clientName  | String   | NOT NULL      | Client full name from form       |
| email       | String   | NOT NULL      | Client contact email             |
| phone       | String   | NULLABLE      | Optional phone number            |
| description | String   | NOT NULL      | Raw case description from client |
| status      | Status   | DEFAULT NEW   | Current case status              |
| createdAt   | DateTime | DEFAULT now() | Submission timestamp             |
| updatedAt   | DateTime | AUTO          | Last modification timestamp      |

**Enum: Status**
NEW ← Just submitted, not yet reviewed
REVIEWING ← Staff is actively reviewing
CONTACTED ← Client has been contacted
CLOSED ← Case resolved or rejected

### Table: ai_analyses

| Column             | Type     | Constraint    | Description                   |
| ------------------ | -------- | ------------- | ----------------------------- |
| id                 | String   | PK, cuid()    | Unique identifier             |
| caseId             | String   | FK, UNIQUE    | Links to cases.id (1:1)       |
| caseType           | String   | NOT NULL      | Legal category classification |
| priority           | Priority | NOT NULL      | Urgency level                 |
| summary            | String   | NOT NULL      | AI-generated case summary     |
| missingInformation | String[] | DEFAULT []    | List of missing details       |
| recommendedAction  | String   | NOT NULL      | Suggested next step           |
| confidenceScore    | Float    | NULLABLE      | AI confidence 0.0 to 1.0      |
| createdAt          | DateTime | DEFAULT now() | Analysis timestamp            |

**Enum: Priority**
LOW
MEDIUM
HIGH

**Case Type Values (enforced by prompt, not enum)**
Personal Injury
Family Law
Employment Law
Contract Dispute
Property Dispute
Criminal Defense
Immigration
Other

We use a String rather than an enum for caseType because
legal categories may expand without requiring a migration.

---

### Table: audit_logs

| Column    | Type     | Constraint    | Description                |
| --------- | -------- | ------------- | -------------------------- |
| id        | String   | PK, cuid()    | Unique identifier          |
| caseId    | String   | FK            | Links to cases.id          |
| userId    | String   | FK, NULLABLE  | Who performed the action   |
| action    | String   | NOT NULL      | Action identifier string   |
| metadata  | Json     | NULLABLE      | Additional context as JSON |
| createdAt | DateTime | DEFAULT now() | When action occurred       |

**userId is nullable** because the initial CASE_CREATED action
is triggered by the system (no logged-in user), not a staff member.

**Action Values**
CASE_CREATED ← New intake submitted
STATUS_CHANGED ← Case status updated
ANALYSIS_GENERATED ← AI analysis completed
ANALYSIS_REGENERATED ← AI re-run by staff

**Metadata Examples**

For STATUS_CHANGED:

```json
{
  "previousStatus": "NEW",
  "newStatus": "REVIEWING"
}
For ANALYSIS_REGENERATED:

JSON

{
  "triggeredBy": "userId",
  "previousCaseType": "Unknown",
  "newCaseType": "Personal Injury"
}
Complete Prisma Schema Preview
prisma

enum Role {
  ADMIN
  REVIEWER
}

enum Status {
  NEW
  REVIEWING
  CONTACTED
  CLOSED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  role      Role     @default(REVIEWER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  auditLogs AuditLog[]

  @@map("users")
}

model Case {
  id          String   @id @default(cuid())
  clientName  String
  email       String
  phone       String?
  description String
  status      Status   @default(NEW)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  aiAnalysis AiAnalysis?
  auditLogs  AuditLog[]

  @@map("cases")
}

model AiAnalysis {
  id                  String   @id @default(cuid())
  caseId              String   @unique
  caseType            String
  priority            Priority
  summary             String
  missingInformation  String[]
  recommendedAction   String
  confidenceScore     Float?
  createdAt           DateTime @default(now())

  case Case @relation(fields: [caseId], references: [id])

  @@map("ai_analyses")
}

model AuditLog {
  id        String   @id @default(cuid())
  caseId    String
  userId    String?
  action    String
  metadata  Json?
  createdAt DateTime @default(now())

  case Case  @relation(fields: [caseId], references: [id])
  user User? @relation(fields: [userId], references: [id])

  @@map("audit_logs")
}
```

Migration Strategy
All schema changes go through Prisma migrations.

Bash

# Development: creates migration file and applies it

npx prisma migrate dev --name <description>

# Production: applies pending migrations

npx prisma migrate deploy
Migration files are committed to git.
This creates a complete history of every schema change.
Never modify a migration file after it has been applied.
