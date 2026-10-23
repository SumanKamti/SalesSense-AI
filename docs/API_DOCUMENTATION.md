# SalesSense AI — REST API Reference

Base URL: `/api/v1`

---

## 1. Authentication (`/auth`)

### `POST /auth/register`
Register a new manager/rep account.

**Request Body:**
```json
{
  "full_name": "Alex Johnson",
  "email": "alex@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "full_name": "Alex Johnson",
  "email": "alex@example.com",
  "role": "manager",
  "created_at": "2026-09-20T12:00:00Z"
}
```

---

### `POST /auth/logout`
Revoke the current JWT bearer token and add it to the server-side blacklist.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "message": "Successfully logged out"
}
```

---

### `POST /auth/forgot-password`
Initiate password reset request with token generation.

**Request Body:**
```json
{
  "email": "alex@example.com"
}
```

---

### `POST /auth/reset-password`
Reset password using verified reset token.

**Request Body:**
```json
{
  "token": "reset_token_here",
  "new_password": "NewSecurePassword123!"
}
```

---

### `POST /auth/login`
Authenticate user credentials and receive a JWT bearer token.

**Request Body:**
```json
{
  "email": "alex@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer"
}
```

---

### `GET /auth/me`
Retrieve profile of currently authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "id": 1,
  "full_name": "Alex Johnson",
  "email": "alex@example.com",
  "role": "manager",
  "created_at": "2026-09-20T12:00:00Z"
}
```

---

## 2. Conversation & Audio Processing (`/conversation`)

### `POST /conversation/analyze`
Upload a recorded sales call audio file. The server transcribes speech, diarizes speakers, and constructs synchronized conversation turns.

**Rate Limit:** 10 requests / minute  
**Headers:** `Authorization: Bearer <token>` (Optional)  
**Content-Type:** `multipart/form-data`

**Parameters:**
- `file`: Audio file (`.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`, `.webm`, max 50 MB)

**Response (200 OK):**
```json
{
  "conversation": [
    {
      "speaker": "SPEAKER_00",
      "start": 0.0,
      "end": 3.8,
      "text": "Hi, thanks for joining our product demo today."
    },
    {
      "speaker": "SPEAKER_01",
      "start": 4.1,
      "end": 6.5,
      "text": "Thanks for having me, excited to see how it works."
    }
  ],
  "conversation_id": 1
}
```

---

## 3. AI Performance Analysis (`/analysis`)

### `POST /analysis/analyze`
Submit conversation turns to Google Gemini for AI-driven sales coaching evaluation.

**Rate Limit:** 10 requests / minute  
**Headers:** `Authorization: Bearer <token>` (Optional)

**Request Body:**
```json
{
  "conversation": [
    {
      "speaker": "SPEAKER_00",
      "text": "Hi, thanks for joining our product demo today."
    },
    {
      "speaker": "SPEAKER_01",
      "text": "Thanks for having me, excited to see how it works."
    }
  ],
  "conversation_id": 1
}
```

**Response (200 OK):**
```json
{
  "analysis": {
    "summary": "The sales representative introduced the platform and addressed customer initial requirements...",
    "sentiment": "Positive",
    "sales_score": 82,
    "strengths": [
      "Clear articulation of value proposition in the first 2 minutes",
      "Proactive discovery questions about prospect's current workflow"
    ],
    "weaknesses": [
      "Allowed prospect objection on pricing to linger without immediate ROI framing"
    ],
    "suggestions": [
      "Reframe pricing discussion around annual time savings",
      "Secure concrete next steps before ending the call"
    ]
  }
}
```

---

## 4. Call History Repository (`/history`)

### `GET /history/`
List all historical calls for the authenticated user, ordered by newest first.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "title": "Initial Demo - Enterprise Tier",
    "audio_filename": "demo_call_sept20.mp3",
    "duration_seconds": 342.5,
    "sales_score": 82,
    "sentiment": "Positive",
    "created_at": "2026-09-20T12:00:00Z"
  }
]
```

---

### `GET /history/{conversation_id}`
Retrieve complete call details, including transcript turns and saved AI coaching evaluation.

**Headers:** `Authorization: Bearer <token>`

---

### `DELETE /history/{conversation_id}`
Delete a call record from history.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "message": "Conversation deleted successfully"
}
```

---

## 5. Health Check (`/health`)

### `GET /health`
Verify server and database connectivity.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## 6. Team & Organization Analytics (`/analytics`)

### `GET /analytics/dashboard`
Retrieve executive organization analytics for managers and admins (call volume, score trends, rep comparisons, sentiment breakdown, and top coaching areas).

**Headers:** `Authorization: Bearer <token>`
**Query Parameters:** `days=30` (7, 30, 90, 365)

**Response (200 OK):**
```json
{
  "overview": {
    "total_calls": 42,
    "avg_score": 76.4,
    "total_duration_mins": 312.5,
    "strong_calls": 24,
    "strong_call_pct": 57.1
  },
  "score_trends": [
    { "week": "2026-09-01", "avg_score": 72.1, "call_count": 8 }
  ],
  "rep_comparison": [
    { "id": 1, "name": "Jane Doe", "role": "sales_rep", "total_calls": 12, "avg_score": 82.5, "avg_duration": 8.2, "strong_calls": 8 }
  ],
  "sentiment_distribution": [
    { "name": "Positive", "value": 24 },
    { "name": "Neutral", "value": 14 },
    { "name": "Negative", "value": 4 }
  ],
  "top_coaching_areas": [
    { "area": "Objection handling on price", "count": 7 }
  ]
}
```

---

## 7. Data Export & Compliance (`/export`)

### `GET /export/call/{call_id}/csv`
Export individual call transcript with speaker labels, timestamps, and AI scorecard as a CSV file.

**Headers:** `Authorization: Bearer <token>`

---

### `GET /export/call/{call_id}/pdf`
Generate and download a branded, professional PDF coaching report with executive summary, metadata table, and coaching action items.

**Headers:** `Authorization: Bearer <token>`

---

### `GET /export/history/csv`
Export organization call history as a structured CSV spreadsheet.

**Headers:** `Authorization: Bearer <token>`

---

### `GET /export/my-data`
**GDPR Article 15 Compliance:** Download all personal account data, conversations, and AI scorecards as JSON.

**Headers:** `Authorization: Bearer <token>`

---

### `DELETE /export/my-data`
**GDPR Article 17 ("Right to be Forgotten"):** Permanently delete user profile, personal data, and call records.

**Headers:** `Authorization: Bearer <token>`

---

### `GET /export/audit-log`
Access immutable security and compliance audit logs (Admins view organization-wide; users view self).

**Headers:** `Authorization: Bearer <token>`

---

## 8. Organization & Member Management (`/organization`)

### `GET /organization/my`
Retrieve details of the user's current organization.

---

### `POST /organization`
Create a new organization workspace (assigns creator as Admin).

---

### `GET /organization/team`
List all team members and pending invites in the organization.

---

### `POST /organization/members`
Add a member directly to the organization (supports both Admin and Manager with role boundary enforcement).

---

### `PUT /organization/team/{user_id}/role`
Update a team member's role (`sales_rep`, `manager`, `admin`). Admin required for promotion to Admin.

---

### `DELETE /organization/team/{user_id}`
Remove a member from the organization workspace.

