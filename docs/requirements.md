# LegalFlow AI — Requirements & User Stories

## Problem Statement

Small and medium-sized law firms receive many client inquiries
every day through websites, email, and contact forms.

The initial intake process is:

- Time-consuming and highly repetitive
- Unstructured with no consistent format
- Difficult to prioritize without reading everything
- Dependent on lawyer time for basic triage decisions

Lawyers spend valuable billable hours reading raw client
submissions just to determine:

- What type of legal issue exists
- How urgent the matter is
- Which lawyer should review it
- What basic information is missing
- Whether the firm should even proceed

This creates delays for clients and operational inefficiency
for the firm.

---

## Solution Statement

LegalFlow AI provides an intelligent first layer before
human review.

When a client submits their case description, the system
immediately:

1. Classifies the legal matter type
2. Assigns a priority level
3. Generates a professional summary
4. Identifies missing information
5. Recommends a next action

Law firm staff see structured, actionable summaries instead
of raw text. Urgent cases are never buried under low-priority
inquiries.

---

## User Personas

### Persona 1: Potential Client

**Name**: Michael Chen
**Situation**: Was injured in a workplace accident.
**Goal**: Find legal representation quickly.
**Pain Point**: Does not know what information lawyers need.
**Expectation**: Submit his situation and hear back soon.

---

### Persona 2: Intake Staff (REVIEWER)

**Name**: Sarah Johnson
**Role**: Legal intake coordinator at a 12-person firm.
**Goal**: Process 20+ inquiries daily without missing urgent ones.
**Pain Point**: Reading long, unstructured client descriptions
to find the key facts.
**Expectation**: See a structured summary and priority level
without reading the raw submission.

---

### Persona 3: Managing Attorney (ADMIN)

**Name**: David Martinez
**Role**: Partner and firm administrator.
**Goal**: Understand intake volume and ensure urgent cases
are handled immediately.
**Pain Point**: No visibility into what is in the intake queue
without asking staff.
**Expectation**: Dashboard showing current intake status
and priority distribution.

---

## User Stories

### Client Stories

Story C-001
As a potential client
I want to submit my legal situation through a simple form
So that I can be evaluated by the law firm without calling

Acceptance Criteria:

Form requires name, email, and case description
Phone number is optional
Description must be detailed enough (50+ characters)
I receive confirmation that my submission was received
I am given a reference that my case is being reviewed
Story C-002
As a potential client
I want to know my submission was received
So that I am not left wondering if anything happened

Acceptance Criteria:

Successful submission shows a confirmation message
Confirmation message explains what happens next
No account creation required to submit

### Intake Staff Stories (REVIEWER)

Story R-001
As intake staff
I want to see all incoming cases in a dashboard
So that I can manage my workload effectively

Acceptance Criteria:

Cases displayed in a table with key information
Table shows: name, case type, priority, status, date
Default sort is newest first
Cases update without requiring page refresh
Story R-002
As intake staff
I want to see AI-generated analysis for each case
So that I can understand the matter without reading the full description

Acceptance Criteria:

Each case shows: case type, priority, summary
Summary is 2-3 sentences maximum
Missing information is listed clearly
Recommended action is displayed
Story R-003
As intake staff
I want to filter cases by status and priority
So that I can focus on what needs attention now

Acceptance Criteria:

Can filter by: NEW, REVIEWING, CONTACTED, CLOSED
Can filter by: LOW, MEDIUM, HIGH priority
Can filter by case type
Filters can be combined
Result count updates with filters
Story R-004
As intake staff
I want to search for a specific client
So that I can find their case quickly

Acceptance Criteria:

Search works on client name
Search works on client email
Results update as I type (debounced)
Story R-005
As intake staff
I want to update the status of a case
So that my team knows where each case stands

Acceptance Criteria:

Can change status to: REVIEWING, CONTACTED, CLOSED
Status change is saved immediately
Change appears in the case audit log

### Administrator Stories (ADMIN)

Story A-001
As an administrator
I want to see dashboard metrics
So that I understand current intake volume and priorities

Acceptance Criteria:

Total cases count visible
New cases (unreviewed) count visible
High priority cases count visible
Closed cases count visible
Story A-002
As an administrator
I want to re-run AI analysis on a case
So that we can get a fresh assessment if needed

Acceptance Criteria:

Re-analyze button visible on case detail (admin only)
New analysis replaces the previous one
Action logged in audit trail
Previous analysis data is updated, not duplicated
Story A-003
As an administrator
I want to see a complete audit trail for each case
So that I know exactly who did what and when

Acceptance Criteria:

Every status change appears in timeline
Every AI analysis appears in timeline
Each entry shows who performed the action
Each entry shows exact timestamp

## Functional Requirements

### FR-001: Public Case Intake

- The intake form must be accessible without authentication
- Required fields: clientName, email, description
- Optional fields: phone
- Minimum description length: 50 characters
- System must trigger AI analysis immediately after submission
- System must store the case regardless of AI analysis result
- System must return confirmation to the client

### FR-002: AI Case Analysis

- System must classify case into one of 8 legal categories
- System must assign priority: LOW, MEDIUM, or HIGH
- System must generate a 2-3 sentence professional summary
- System must identify missing information as a list
- System must provide a recommended next action
- AI response must be validated before storage
- System must handle AI service failures gracefully
- Failed analysis must not prevent case storage

### FR-003: Staff Authentication

- Staff must log in with email and password
- Passwords must never be stored in plaintext
- Passwords must be hashed with bcrypt
- Sessions must use JWT tokens
- JWT tokens must expire after 24 hours
- Invalid or expired tokens must be rejected with 401

### FR-004: Role-Based Authorization

- ADMIN role has access to all endpoints
- REVIEWER role has access to view and status update endpoints
- REVIEWER role cannot access user management or re-analyze endpoints
- All protected routes must validate both authentication and role

### FR-005: Case Management

- Staff can view all cases with pagination
- Staff can filter by status, priority, and case type
- Staff can search by client name or email
- Staff can update case status
- Status updates must be logged immediately

### FR-006: Audit Logging

- Case creation must be logged
- AI analysis generation must be logged
- Status changes must be logged with previous and new status
- All logs must include timestamp
- Status change logs must include the userId of who made the change

### FR-007: Dashboard Metrics

- Total case count must be displayed
- New case count must be displayed
- High priority case count must be displayed
- Closed case count must be displayed

## Non-Functional Requirements

### NFR-001: Security

- No API keys or secrets in any frontend code
- No API keys in git history
- JWT secret minimum 32 characters
- bcrypt salt rounds minimum 10

### NFR-002: Code Quality

- TypeScript strict mode enabled on both frontend and backend
- ESLint configured and passing
- Prettier formatting enforced
- Conventional commits on all commits

### NFR-003: Reliability

- AI service failure must not prevent case storage
- All API errors must return structured JSON responses
- No unhandled promise rejections

### NFR-004: Developer Experience

- README includes complete local setup instructions
- .env.example files document all required variables
- Seed script provides usable demo data
