<div align="center">

# MediQuest

### *Study Smarter. Prepare Better. Succeed in USMLE & PLAB.*

**An AI-powered web platform for personalized medical exam preparation**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

[Live Demo](#) · [Report Bug](https://github.com/wareeshayy/FYP-MediQuest/issues) · [Request Feature](https://github.com/wareeshayy/FYP-MediQuest/issues)

</div>

---

## About the Project

**MediQuest** is a Final Year Project developed at the **National University of Computer and Emerging Sciences (FAST-NU), Chiniot, Pakistan**. It addresses a real gap in medical education: students preparing for international licensing exams like **USMLE** and **PLAB** often rely on fragmented resources, costly coaching, and tools that lack personalized feedback.

MediQuest brings everything together in one place — AI-generated practice questions, curated study PDFs, performance analytics, expert mentoring, and a medical-only AI assistant — so students can prepare with confidence and clarity.

---

## The Problem We Solve

| Challenge | How MediQuest Helps |
|-----------|---------------------|
| Scattered study resources | Centralized reading material library & quiz builder |
| No personalized feedback | AI-driven MCQs with explanations & analytics |
| Expensive, rigid coaching | Affordable, adaptive, self-paced learning |
| Hard to track weak areas | Visual dashboards & progress tracking |
| Limited expert access | Expert profiles with Zoom consultation |

---

## Key Features

### For Students
- **AI Quiz Generator** — Create USMLE-style MCQs from any medical topic or PDF study material
- **Reading Material Library** — 17+ curated USMLE PDFs (Biochemistry, Pharmacology, Cardiology, and more)
- **Interactive Quiz Play** — Timed quizzes with instant grading and detailed review
- **Performance Analytics** — Charts and insights to track strengths, weaknesses, and readiness
- **AI Study Chatbot** — Medical-only doubt-solving assistant with domain guardrails
- **Personalized Dashboard** — Clean, modern UI built for focused study sessions

### For Educators & Experts
- **Expert Dashboard** — Manage classes, assign quizzes, and monitor student performance
- **Expert Profiles** — Showcase qualifications and schedule live Zoom mentoring sessions
- **Student Messaging** — Direct communication between educators and learners
- **Performance Reports** — Analyze class-wide and individual student trends

### For Admins
- **Role-Based Access Control** — Secure separation between Student, Educator, and Admin roles
- **Content & User Management** — Platform oversight and moderation capabilities

### AI & Medical Safety Layer
- Multi-provider AI pipeline: **Groq**, **Hugging Face** (MedAlpaca / MedGemma), with automatic fallback
- Strict **USMLE/medical-only** topic validation — non-medical queries are blocked
- PDF text extraction for context-aware question generation
- Structured JSON output with explanations for every MCQ

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Shadcn/UI, Framer Motion |
| **Backend** | Next.js API Routes, Supabase (Auth, PostgreSQL, RLS) |
| **AI / ML** | Groq SDK, Hugging Face Inference API, OpenAI (optional), Google Gemini (optional) |
| **Charts** | Chart.js, react-chartjs-2 |
| **Integrations** | Zoom API (expert sessions), PDF parsing |
| **Validation** | Zod, React Hook Form |

---

## Project Structure

```
FYP-MediQuest/
├── public/
│   └── reading-material/     # USMLE study PDFs
├── src/
│   ├── app/                  # Pages & API routes (App Router)
│   │   ├── api/              # generate-questions, chat, zoom, etc.
│   │   ├── dashboard/        # Student dashboard
│   │   ├── create-quiz/      # AI quiz builder
│   │   ├── reading-material/ # PDF library
│   │   ├── experts/          # Expert profiles (educators only)
│   │   ├── educator/         # Expert portal
│   │   └── analytics/        # Performance charts
│   ├── components/           # UI, layout, auth, chat
│   ├── hooks/                # useAuth, useUserRole
│   └── lib/                  # AI, prompts, Supabase, Zoom
├── .env.local.example        # Environment template (safe to commit)
└── .gitignore                # Excludes secrets & node_modules
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://www.npmjs.org/) or [yarn](https://yarnpkg.com/)
- A [Supabase](https://supabase.com/) project
- At least one AI API key (Groq or Hugging Face recommended)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/wareeshayy/FYP-MediQuest.git
cd FYP-MediQuest

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
```

Open `.env.local` and fill in your credentials:

```env
# Required — Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required — AI (at least one)
GROQ_API_KEY=your_groq_api_key
HUGGINGFACE_API_KEY=your_huggingface_token
MEDICAL_AI_PROVIDER=groq

# Optional — Zoom expert sessions
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_ACCOUNT_ID=your_zoom_account_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
```

```bash
# 4. Run the development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## Security Notice

> **Never commit `.env.local` or any file containing real API keys.**

This repository uses `.gitignore` to exclude:
- `.env`, `.env.local`, and all secret env files
- `node_modules/`
- `.next/` build cache
- `credentials.json` and key files

Only `.env.local.example` (with placeholder values) is included for setup reference.

---

## User Roles

| Role | Access |
|------|--------|
| **Student** | Dashboard, quizzes, reading material, analytics, AI chatbot |
| **Educator / Expert** | Expert portal, student reports, messaging, expert profiles, Zoom scheduling |
| **Admin** | Full platform access including user and content management |

---

## FYP Team

| Name | Roll No. |
|------|----------|
| **Wareesha** | 22F-3441 |
| **Humna Muhib** | 22F-3345 |
| **Sania Mazhar** | 22F-3279 |

**Supervisor:** Ma'am Faryal Saud  
**Department:** Computer Science  
**Institution:** National University of Computer and Emerging Sciences (FAST-NU), Chiniot  
**Year:** 2025

---

## Screenshots

> *Add screenshots of Dashboard, Create Quiz, Reading Material, Analytics, and Expert Portal here.*

---

## Future Enhancements

- Mobile-responsive PWA
- Collaborative study groups & discussion forums
- Mock test mode with timed USMLE simulation
- Admin content verification workflow
- Predictive readiness scoring with ML models
- PLAB-specific question banks

---

## License

This project was developed as an academic Final Year Project. All rights reserved by the FYP team.

---

<div align="center">

**Built with dedication for medical students everywhere**

*MediQuest — Where AI meets medical excellence*

</div>
