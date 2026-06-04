# LegalFlow AI — API Specification

## Overview

RESTful JSON API built with NestJS.
All responses are JSON.
All request bodies are JSON.

---

## Base URLs

| Environment | URL                                    |
| ----------- | -------------------------------------- |
| Development | http://localhost:3001/api              |
| Production  | https://legalflow-api.onrender.com/api |

---

## Authentication

Protected endpoints require a Bearer token in the
Authorization header.
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Tokens are obtained from POST /api/auth/login.
Tokens expire after 24 hours.

---

## Standard Error Format

All errors follow this consistent structure:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    "email must be a valid email address",
    "description must be at least 50 characters"
  ],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/cases"
}
HTTP Status Codes
Code	Meaning
200	Success
201	Resource created successfully
400	Validation error or bad request
401	Missing or invalid authentication token
403	Valid token but insufficient permissions
404	Resource not found
500	Internal server error
Endpoints
AUTH
POST /api/auth/register
Creates a new staff user account.

Authentication: Required (ADMIN role)
Exception: First user can register without authentication.

Request Body:

JSON

{
  "name": "Jane Smith",
  "email": "jane@lawfirm.com",
  "password": "SecurePass123!",
  "role": "REVIEWER"
}
Validation Rules:

name: required, minimum 2 characters
email: required, valid email format, unique
password: required, minimum 8 characters
role: optional, ADMIN or REVIEWER, defaults to REVIEWER
Response 201:

JSON

{
  "id": "clh3k2j4k0000pb4k",
  "name": "Jane Smith",
  "email": "jane@lawfirm.com",
  "role": "REVIEWER",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
Note: Password is never returned in any response.

POST /api/auth/login
Authenticates a staff user and returns a JWT token.

Authentication: None required.

Request Body:

JSON

{
  "email": "jane@lawfirm.com",
  "password": "SecurePass123!"
}
Response 200:

JSON

{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clh3k2j4k0000pb4k",
    "name": "Jane Smith",
    "email": "jane@lawfirm.com",
    "role": "REVIEWER"
  }
}
Response 401 (invalid credentials):

JSON

{
  "statusCode": 401,
  "message": "Invalid email or password"
}
CASES
POST /api/cases
Submits a new client intake form.
Triggers AI analysis automatically.

Authentication: None (public endpoint)

Request Body:

JSON

{
  "clientName": "John Doe",
  "email": "john@example.com",
  "phone": "+12345678901",
  "description": "I was injured in a car accident three weeks ago and the insurance company is refusing to cover my medical expenses despite having a valid policy."
}
Validation Rules:

clientName: required, minimum 2 characters
email: required, valid email format
phone: optional
description: required, minimum 50 characters
Response 201:

JSON

{
  "id": "clh3k2j4k0001pb4k",
  "clientName": "John Doe",
  "email": "john@example.com",
  "phone": "+12345678901",
  "status": "NEW",
  "aiAnalysis": {
    "caseType": "Personal Injury",
    "priority": "HIGH",
    "summary": "Client reports injuries from a motor vehicle accident with subsequent insurance claim denial for medical expenses.",
    "missingInformation": [
      "Exact date of accident",
      "Name of insurance company",
      "Whether a police report was filed",
      "Nature and extent of injuries",
      "Medical treatment received"
    ],
    "recommendedAction": "Schedule urgent consultation. Request police report, insurance policy details, and medical records."
  },
  "createdAt": "2024-01-01T00:00:00.000Z"
}
GET /api/cases
Returns a paginated list of all cases with basic AI analysis data.

Authentication: Required (ADMIN or REVIEWER)

Query Parameters:

Parameter	Type	Description
status	string	Filter by: NEW, REVIEWING, CONTACTED, CLOSED
priority	string	Filter by: LOW, MEDIUM, HIGH
caseType	string	Filter by case type string
search	string	Search client name or email
page	number	Page number, default 1
limit	number	Results per page, default 20, max 100
Example Request:


GET /api/cases?status=NEW&priority=HIGH&page=1&limit=20
Response 200:

JSON

{
  "data": [
    {
      "id": "clh3k2j4k0001pb4k",
      "clientName": "John Doe",
      "email": "john@example.com",
      "phone": "+12345678901",
      "status": "NEW",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "aiAnalysis": {
        "caseType": "Personal Injury",
        "priority": "HIGH"
      }
    }
  ],
  "meta": {
    "total": 47,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
GET /api/cases/:id
Returns complete case details including full AI analysis
and audit log history.

Authentication: Required (ADMIN or REVIEWER)

Response 200:

JSON

{
  "id": "clh3k2j4k0001pb4k",
  "clientName": "John Doe",
  "email": "john@example.com",
  "phone": "+12345678901",
  "description": "I was injured in a car accident three weeks ago...",
  "status": "REVIEWING",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T02:00:00.000Z",
  "aiAnalysis": {
    "id": "clh3k2j4k0002pb4k",
    "caseType": "Personal Injury",
    "priority": "HIGH",
    "summary": "Client reports injuries from a motor vehicle accident...",
    "missingInformation": [
      "Exact date of accident",
      "Name of insurance company"
    ],
    "recommendedAction": "Schedule urgent consultation.",
    "confidenceScore": 0.92,
    "createdAt": "2024-01-01T00:00:05.000Z"
  },
  "auditLogs": [
    {
      "id": "clh3k2j4k0003pb4k",
      "action": "CASE_CREATED",
      "userId": null,
      "metadata": {},
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "clh3k2j4k0004pb4k",
      "action": "ANALYSIS_GENERATED",
      "userId": null,
      "metadata": {
        "caseType": "Personal Injury",
        "priority": "HIGH"
      },
      "createdAt": "2024-01-01T00:00:05.000Z"
    },
    {
      "id": "clh3k2j4k0005pb4k",
      "action": "STATUS_CHANGED",
      "userId": "clh3k2j4k0000pb4k",
      "metadata": {
        "previousStatus": "NEW",
        "newStatus": "REVIEWING"
      },
      "createdAt": "2024-01-01T02:00:00.000Z",
      "user": {
        "name": "Jane Smith"
      }
    }
  ]
}
Response 404:

JSON

{
  "statusCode": 404,
  "message": "Case not found"
}
PATCH /api/cases/:id/status
Updates the status of a case.
Creates an audit log entry automatically.

Authentication: Required (ADMIN or REVIEWER)

Request Body:

JSON

{
  "status": "REVIEWING"
}
Validation:

status: required, must be NEW, REVIEWING, CONTACTED, or CLOSED
Response 200:

JSON

{
  "id": "clh3k2j4k0001pb4k",
  "status": "REVIEWING",
  "updatedAt": "2024-01-01T02:00:00.000Z"
}
AI
POST /api/ai/analyze/:caseId
Re-runs AI analysis on an existing case.
Replaces the previous analysis.
Creates an audit log entry.

Authentication: Required (ADMIN role only)

Response 200:

JSON

{
  "id": "clh3k2j4k0006pb4k",
  "caseType": "Personal Injury",
  "priority": "HIGH",
  "summary": "Updated analysis based on same description...",
  "missingInformation": [
    "Exact date of accident"
  ],
  "recommendedAction": "Schedule urgent consultation.",
  "confidenceScore": 0.95,
  "createdAt": "2024-01-01T06:00:00.000Z"
}
Response 404:

JSON

{
  "statusCode": 404,
  "message": "Case not found"
}
DASHBOARD
GET /api/dashboard/metrics
Returns aggregate statistics for the dashboard overview.

Authentication: Required (ADMIN or REVIEWER)

Response 200:

JSON

{
  "totalCases": 145,
  "newCases": 23,
  "highPriorityCases": 18,
  "closedCases": 67,
  "byStatus": {
    "NEW": 23,
    "REVIEWING": 35,
    "CONTACTED": 20,
    "CLOSED": 67
  },
  "byCaseType": {
    "Personal Injury": 45,
    "Family Law": 30,
    "Employment Law": 25,
    "Contract Dispute": 20,
    "Other": 25
  }
}

Gemini AI Prompt
This is the exact prompt structure used for case analysis.


You are an experienced legal intake specialist at a law firm.

Analyze the following client case description and return a
structured assessment to help attorneys prioritize and prepare.

Case Description:
"""
{caseDescription}
"""

Return ONLY a valid JSON object. No explanation. No markdown.
No additional text. Only the JSON object below:

{
  "caseType": "one of: Personal Injury, Family Law, Employment Law, Contract Dispute, Property Dispute, Criminal Defense, Immigration, Other",
  "priority": "one of: LOW, MEDIUM, HIGH",
  "summary": "2-3 sentence professional summary of the legal matter",
  "missingInformation": ["list", "of", "missing", "details", "needed"],
  "recommendedAction": "specific next step the firm should take"
}

Priority Guidelines:
- HIGH: Urgent deadlines, statute of limitations risk, criminal matter, immediate safety concern
- MEDIUM: Clear legal matter requiring timely attention but no immediate deadline
- LOW: Informational inquiry, minor matter, or situation requiring more information before assessment


```
