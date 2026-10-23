# 🎙️ SalesSense AI — Intelligent Sales Conversation & Coaching Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Faster--Whisper](https://img.shields.io/badge/Faster--Whisper-Speech--to--Text-orange.svg)](https://github.com/SYSTRAN/faster-whisper)
[![Google Gemini](https://img.shields.io/badge/Google--Gemini-AI--Coaching-blue.svg?logo=google&logoColor=white)](https://aistudio.google.com/)

SalesSense AI is an AI-powered conversation intelligence platform that transcribes sales call recordings, separates speakers (Sales Rep vs. Prospect) with word-level temporal precision, and generates comprehensive pitch evaluations, customer sentiment analysis, and targeted sales coaching insights.

---

## ✨ Features

- **🎙️ Fast Speech-to-Text**: Local CPU speech transcription using `faster-whisper` (`int8` quantization) with Voice Activity Detection (VAD).
- **👥 Intelligent Speaker Diarization**: Multi-speaker identification (Sales Agent vs. Customer) using lightweight embedding clustering + AI dialogue refinement for phone & hold systems.
- **⚡ Quick Executive Analysis**: At-a-glance snapshot cards showing score verdict, sentiment, talk ratio, top 2 strengths, 2 coaching points, and the #1 action item (no long walls of text).
- **⏱️ Synchronized Interactive Playback**: Click any transcript dialogue turn to seek audio instantly; real-time playback highlighting & audio waveform visualization.
- **📊 100-Point Sales Quality Score**: Multi-competency assessment (Opening & Rapport, Value Proposition, Objection Handling, Closing).
- **📈 Team Analytics Dashboard**: Manager performance dashboard tracking organization call volume, weekly score trends, rep comparisons, and common coaching areas.
- **🏢 Enterprise Multi-Tenancy**: Organization workspaces with role-based access control (Admin, Manager, Rep) and collaborative team management.
- **📄 Comprehensive Exporting & GDPR**: Download branded PDF coaching reports, CSV call spreadsheets, GDPR personal data exports, account deletion, and immutable audit logging.
- **🔒 Production-Grade Security**: JWT authentication with JTI token revocation/blacklisting, bcrypt hashing, SlowAPI rate limiting, and Alembic database migrations.

---

## 🏗️ Project Architecture

```text
SalesSense-AI/
├── backend/
│   ├── alembic/             # Alembic database migration scripts & versions
│   ├── app/
│   │   ├── api/v1/          # REST API routers (auth, conversation, analysis, history, analytics, export, organization)
│   │   ├── core/            # Config, rate limiter, audit middleware, JWT revocation & security
│   │   ├── database/        # PostgreSQL SQLAlchemy engine, session factory, base
│   │   ├── models/          # User, Organization, Conversation, AuditLog, TokenBlacklist, Invitation
│   │   ├── schemas/         # Pydantic v2 validation models
│   │   ├── services/        # Whisper, Diarization, Conversation, Gemini analysis, Auth, Organization
│   │   └── main.py          # FastAPI application entry point
│   ├── tests/               # Pytest automated test suite (26 passing tests)
│   ├── requirements.txt     # Python production dependencies
│   └── .env.example         # Backend environment template
├── frontend/
│   ├── public/              # Static assets (favicons, SVG icons)
│   ├── src/
│   │   ├── components/      # UploadCard, TranscriptCard, AnalysisCard, QuickAnalysisModal, WaveformPlayer, Navbar, ErrorBoundary
│   │   ├── pages/           # HomePage, Dashboard, HistoryPage, CallDetailPage, AnalyticsDashboardPage, TeamPage, LoginPage, NotFoundPage
│   │   ├── services/        # Axios API client with automatic bearer auth interceptors
│   │   └── styles/          # Global design system, theme variables & dark mode support
│   ├── package.json         # Node dependencies (React 19, Vite, Recharts, Lucide)
│   ├── vite.config.js       # Vite development & build configuration
│   └── .env.example         # Frontend environment template
├── docs/                    # Technical documentation & API references
│   ├── ARCHITECTURE.md      # Detailed system design & pipeline breakdown
│   └── API_DOCUMENTATION.md # Complete REST API endpoint reference
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **PostgreSQL 14+** (running locally or cloud-hosted)
- **Google Gemini API Key** (Free at [aistudio.google.com](https://aistudio.google.com))

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS / Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Edit `backend/.env` with your credentials:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/salessense_db"
SECRET_KEY="your-secure-random-secret-key"
GEMINI_API_KEY="your-gemini-api-key"
```

Start the backend server:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Backend API will be accessible at: `http://127.0.0.1:8000` (Swagger docs: `http://127.0.0.1:8000/docs`).

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Frontend UI will be live at: `http://localhost:5173`.

---

## 📖 Documentation

- [System Architecture & Processing Pipeline](docs/ARCHITECTURE.md)
- [REST API Reference & Schemas](docs/API_DOCUMENTATION.md)

---

## 📄 License

This project is licensed under the MIT License.