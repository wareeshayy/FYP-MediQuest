<div align="center">

# MediQuest

### *Study Smarter. Prepare Better. Succeed in USMLE & PLAB.*

**An AI-powered web platform for personalized medical exam preparation**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

[Live Demo](https://fyp-medi-quest.vercel.app) · [SRS Document](docs/MEDIQUEST-SRS.pdf) · [Report Bug](https://github.com/wareeshayy/FYP-MediQuest/issues)

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
- **RAG (Retrieval-Augmented Generation)** — grounded answers & MCQs from 17 USMLE PDFs
- Strict **USMLE/medical-only** topic validation — non-medical queries are blocked
- PDF text extraction for context-aware question generation
- Structured JSON output with explanations for every MCQ

---

## RAG Implementation (Retrieval-Augmented Generation)

MediQuest uses **RAG** to reduce AI hallucination and ground quiz generation and chatbot answers in **verified USMLE study PDFs** instead of relying only on the LLM's memory.

### Why RAG?

| Without RAG | With RAG |
|-------------|----------|
| Full PDF text truncated (~14k chars) sent to LLM | Only **top relevant chunks** retrieved per query |
| Irrelevant paragraphs waste context window | Cosine similarity finds on-topic excerpts |
| Higher hallucination risk | Answers cite material from Pharmacology, Cardiology, etc. |
| Same context for every topic | Dynamic retrieval per student question/topic |

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  OFFLINE — INGEST (one-time: npm run rag:ingest)                 │
│                                                                  │
│  17 PDFs (public/reading-material/)                              │
│       ↓ pdf-parse extract                                        │
│  Raw text per subject                                            │
│       ↓ chunkText() — 1800 chars, 200 overlap                    │
│  ~998 text chunks                                                │
│       ↓ Hugging Face embeddings (all-MiniLM-L6-v2)               │
│  Vector index → data/rag/chunks.json                             │
└──────────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────────┐
│  ONLINE — RETRIEVE + GENERATE (every quiz / chat request)        │
│                                                                  │
│  Student query / quiz topic                                      │
│       ↓ embed query (same HF model)                              │
│       ↓ cosine similarity vs all chunks                          │
│       ↓ top-K chunks (K=6 quiz, K=4 chat)                        │
│       ↓ buildRAGContext() — formatted prompt context             │
│       ↓ Groq / Hugging Face LLM (existing medical guardrails)    │
│  USMLE MCQs or chat answer (grounded in PDFs)                    │
└──────────────────────────────────────────────────────────────────┘
```

### RAG Pipeline — Step by Step

#### Step 1: Document Ingestion
- **Source:** 17 curated PDFs in `public/reading-material/` (Biochemistry, Pharmacology, Cardiovascular, First Aid, etc.)
- **Script:** `npm run rag:ingest` → runs `scripts/ingest-rag.ts`
- **Process:** For each PDF → extract text → split into chunks → embed each chunk → save to index

#### Step 2: Chunking
- **File:** `src/lib/rag/chunkText.ts`
- **Chunk size:** 1,800 characters
- **Overlap:** 200 characters (preserves context across chunk boundaries)
- **Minimum chunk:** 80 characters (filters noise)

#### Step 3: Embeddings
- **File:** `src/lib/rag/embeddings.ts`
- **Model:** `sentence-transformers/all-MiniLM-L6-v2` (via Hugging Face Inference API)
- **Dimensions:** 384
- **Normalization:** L2-normalized vectors for cosine similarity
- **API key:** `HUGGINGFACE_API_KEY` in `.env.local`

#### Step 4: Vector Store
- **File:** `src/lib/rag/store.ts`
- **Storage:** `data/rag/chunks.json` (file-based index, ~9.5 MB, 998 chunks)
- **Not Supabase:** RAG index is separate from Supabase auth/database
- **Vercel:** Bundled via `outputFileTracingIncludes` in `next.config.mjs`

#### Step 5: Retrieval
- **File:** `src/lib/rag/retrieve.ts`
- Embed the user query → cosine similarity against all chunks → return top-K
- Optional filter by `materialId` (e.g. only Pharmacology PDF)
- Minimum relevance score threshold: 0.15

#### Step 6: Context Building
- **File:** `src/lib/rag/buildContext.ts`
- Formats retrieved chunks with source labels and relevance scores
- Instructs LLM to use **only** retrieved excerpts

#### Step 7: Integration (non-breaking)
- **File:** `src/lib/rag/enrich.ts`
- **Quiz:** `enrichQuizContentWithRAG()` — only when `sourceType === "reading-material"` or `materialId` is set
- **Chat:** `enrichChatContextWithRAG()` — appends RAG context to existing chat context
- **Fallback:** If index missing or retrieval fails → original behavior unchanged

### RAG File Structure

```
src/lib/rag/
├── types.ts          # RAGChunkRecord, RAGIndex, RetrievedChunk
├── config.ts         # Chunk size, model, paths, RAG_ENABLED flag
├── chunkText.ts      # Text splitting with overlap
├── embeddings.ts     # HF feature extraction + cosine similarity
├── store.ts          # Load/save data/rag/chunks.json
├── retrieve.ts       # Top-K semantic search
├── buildContext.ts   # LLM prompt context formatter
├── enrich.ts         # Quiz & chat integration layer
└── ingest.ts         # Batch ingest all 17 PDFs

src/app/api/rag/
├── status/route.ts   # GET — check index health
├── search/route.ts   # POST — test retrieval
└── ingest/route.ts   # POST — rebuild index (Vercel, secret-protected)

scripts/
└── ingest-rag.ts     # CLI ingest script

data/rag/
└── chunks.json       # Pre-built vector index (998 chunks)
```

### Where RAG Is Used

| Feature | API Route | RAG Behavior |
|---------|-----------|--------------|
| Quiz from PDF | `/api/generate-questions` | Retrieves chunks for topic + materialId → replaces truncated PDF text |
| AI Chatbot | `/api/chat` | Retrieves chunks for user question → appends to context |
| Status check | `/api/rag/status` | Returns chunk count, materials, availability |
| Manual search | `/api/rag/search` | Debug/test retrieval |

### RAG Environment Variables

```env
# Required for embeddings (ingest + query-time retrieval)
HUGGINGFACE_API_KEY=hf_your_token

# Optional — default true; set false to disable RAG
RAG_ENABLED=true

# Embedding model (default shown)
RAG_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Optional — protects POST /api/rag/ingest on Vercel
RAG_INGEST_SECRET=your_random_secret
```

### RAG Setup Commands

```bash
# Build index locally (requires HUGGINGFACE_API_KEY, ~12 min for 17 PDFs)
npm run rag:ingest

# Check index status
curl http://localhost:3000/api/rag/status

# Test retrieval
curl -X POST http://localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query":"beta blockers mechanism","materialId":"pharmacology","topK":3}'
```

### Vercel Deployment Notes

1. Add `HUGGINGFACE_API_KEY` to Vercel Environment Variables
2. `data/rag/chunks.json` is committed to the repo (pre-built index)
3. `next.config.mjs` includes `outputFileTracingIncludes` so serverless functions can read the index
4. Verify after deploy: `https://fyp-medi-quest.vercel.app/api/rag/status` → `"available": true`

### RAG Statistics (Current Index)

| Metric | Value |
|--------|-------|
| Source PDFs | 17 |
| Total chunks | 998 |
| Embedding model | all-MiniLM-L6-v2 |
| Embedding dimensions | 384 |
| Index file | `data/rag/chunks.json` |

### Future RAG Enhancements

- Supabase **pgvector** for scalable cloud storage
- Hybrid search (vector + keyword BM25)
- Re-ranking with cross-encoder
- Source citations in chatbot UI
- Student-uploaded PDF RAG

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Shadcn/UI, Framer Motion |
| **Backend** | Next.js API Routes, Supabase (Auth, PostgreSQL, RLS) |
| **AI / ML** | Groq SDK, Hugging Face Inference API, RAG (embeddings + retrieval), OpenAI (optional) |
| **Charts** | Chart.js, react-chartjs-2 |
| **Integrations** | Zoom API (expert sessions), PDF parsing |
| **Validation** | Zod, React Hook Form |

---

## Project Structure

```
FYP-MediQuest/
├── docs/
│   └── MEDIQUEST-SRS.pdf       # Software Requirements Specification (FYP)
├── data/rag/
│   └── chunks.json             # RAG vector index (998 chunks)
├── public/
│   └── reading-material/       # 17 USMLE study PDFs (RAG source)
├── scripts/
│   └── ingest-rag.ts           # Build RAG index from PDFs
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── rag/            # RAG status, search, ingest APIs
│   │   │   ├── generate-questions/
│   │   │   └── chat/
│   │   ├── dashboard/
│   │   ├── create-quiz/
│   │   ├── reading-material/
│   │   ├── experts/
│   │   ├── educator/
│   │   └── analytics/
│   ├── lib/
│   │   ├── rag/                # RAG pipeline modules
│   │   ├── medicalAI.ts
│   │   └── promptBuilder.ts
│   └── components/
├── .env.local.example
└── .gitignore
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

# RAG (Retrieval-Augmented Generation)
RAG_ENABLED=true
RAG_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
RAG_INGEST_SECRET=your_random_secret
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
**Year:** 2026

---

## Documentation

| Document | Description |
|----------|-------------|
| [MEDIQUEST-SRS.pdf](docs/MEDIQUEST-SRS.pdf) | Full Software Requirements Specification — problem statement, use cases, functional/non-functional requirements, diagrams (FAST-NU FYP) |
| [README.md](README.md) | Setup guide, tech stack, and **RAG implementation details** |

---

## Future Enhancements

- Supabase pgvector migration for RAG at scale
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
