# Tutor App — Working Specs (v0)

This document captures the initial product + technical decisions agreed in chat. It is a **living spec** and should be updated as decisions change.

## Product idea (high level)
- Users can **upload or paste notes** from:
  - PDFs, DOCX, images (OCR), and YouTube lesson links (transcripts).
- Notes become **accessible inside the app** (view + organize).
- App includes a **notes editor** and an **Agent/Chat panel** (side-by-side) where the user can:
  - reference their notes
  - ask questions grounded in those notes
- App can generate **practice material**:
  - exercises, flashcards, mock exams, etc.
- **Per-user data isolation** via authentication.

## Frontend stack
- **Framework**: Next.js
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Rich text editor**: TipTap
- **PDF viewing**: react-pdf
- **Core UI layout**: editor/viewer + agent panel side-by-side (Cursor-like)

## Backend stack
- **API**: Next.js API routes (initially)
- **Database**: Supabase-hosted Postgres
- **Object storage**: Supabase Storage
- **Auth**: Auth.js (NextAuth) initially (Supabase Auth optional later)
- **ORM / DB toolkit**: Prisma

## Internationalization (i18n) + multilingual support (REQUIRED)
This app must be usable in multiple languages (e.g., English + Korean) for both the **UI** and **user content**.

Guidelines:
- **UI localization**: all user-facing strings must come from a translation system (no hardcoded UI copy).
- **User preference**: store a per-user `locale` (and optionally `timezone`) and default the UI to it.
- **Multilingual content**: uploads/notes may be in any language; store `contentLanguage` when detectable (optional but useful).
- **Agent behavior**: the agent should respond in the user’s preferred language by default, and support “explain in X” requests.
- **RAG retrieval**: embeddings + similarity search must work for multilingual notes/queries (choose multilingual-capable embedding model).

## Data storage approach (files + metadata)
### Object storage (binary)
Store uploaded binaries in Supabase Storage:
- PDFs, DOCX, images (and other media later)
- Use private buckets and generate signed URLs for access when needed

### Postgres (structured + derived)
Store in Postgres:
- file/document metadata (name, mime type, size, owner, status)
- extracted text (raw and/or normalized)
- chunked text for retrieval
- chat history and generated study materials

## Agent/RAG approach
### RAG (Retrieval-Augmented Generation)
Purpose: allow the chat agent to answer questions grounded in the user’s notes without pasting entire documents into the prompt.

Flow:
1. Ingest content (upload/link)
2. Extract text (and transcript/OCR when needed)
3. Chunk text into passages
4. Embed chunks and store vectors
5. At question time:
   - embed the user query
   - retrieve top relevant chunks
   - provide those chunks to the model as context
   - generate an answer with citations/snippets

### Vector search: pgvector
- Use **pgvector** (Postgres extension) to store embeddings and run similarity search in the same Postgres database.
- This avoids a separate vector DB early (e.g., Pinecone) and keeps infra minimal.

### Model provider
- **OpenAI** as the initial LLM provider
- Keep the option open to support Anthropic later via an abstraction layer

## MVP scope (suggested sequencing)
Start narrow and expand:
- Auth.js authentication + per-user workspace
- Upload **PDF** + storage + text extraction
- Viewer + basic note organization
- Agent chat with RAG over uploaded PDFs
- Practice material v1: **flashcards** (first), then exercises/mock exams

## Cost + scaling notes (early guardrails)
Main cost drivers:
- **LLM usage** (chat + generation + embeddings)
- **Storage + bandwidth** (files, previews, downloads)

Early controls to implement:
- per-user quotas/limits (uploads, pages processed, generations)
- file size/page limits for free tier
- logging/usage tracking for future billing

## Open questions (to resolve later)
- Which ingestion types are included in MVP v1 beyond PDF (DOCX, image OCR, YouTube)?
- Job processing: background worker strategy (simple DB job table vs queue)
- Data model details: documents vs “editable notes” vs imported sources
- Citation UX: how to display retrieved passages in the agent answers
- i18n implementation choice (e.g., `next-intl`) and initial supported locales
