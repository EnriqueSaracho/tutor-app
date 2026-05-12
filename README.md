# Tutor App

A notes-aware tutor: upload study materials, then chat with an assistant that grounds answers in **your** PDFs using retrieval-augmented generation (RAG).

Long-term product vision and future-state AI reference material are documented in [`docs/ai-future-final-version/future-final-project-spec.md`](docs/ai-future-final-version/future-final-project-spec.md). Phase 3 follow-up work is tracked in [`docs/phase-3/phase-3-todo.md`](docs/phase-3/phase-3-todo.md).

## What this repo contains today

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **PDF upload** → text extraction → chunking → **OpenAI embeddings** → in-memory vector store
- **Chat API** that retrieves top chunks by embedding similarity and calls **OpenAI** (`gpt-4o-mini`) with those excerpts as context

This repo is an early slice of the longer-term vision described in `docs/ai-future-final-version/future-final-project-spec.md`. Planned direction includes Supabase (Postgres + Storage + **pgvector**), Auth.js, TipTap editor, richer ingestion (DOCX, OCR, YouTube), i18n, and practice tools (flashcards, etc.).

## Prerequisites

- Node.js (LTS recommended)
- An [OpenAI](https://platform.openai.com/) API key with access to chat and embedding models

## Setup

From the project root:

Create `.env.local` in the project root with:

```bash
OPENAI_API_KEY=sk-...
```

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Upload a PDF, then ask questions in the chat UI.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Development server       |
| `npm run build`| Production build           |
| `npm run start`| Production server          |
| `npm run lint` | ESLint                     |

## Project layout

- `src/app/` — Next.js application routes and UI
- `src/app/api/` — API routes
- `docs/ai-future-final-version/future-final-project-spec.md` — long-term future/final-version project spec for AI and planning reference
- `docs/phase-3/phase-3-todo.md` — deferred Phase 3 work items
