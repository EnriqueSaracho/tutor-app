# Tutor App (Next.js)

This folder is the Next.js application. **Repository overview, setup, and roadmap** are in the parent [`README.md`](../README.md) and [`SPECS.md`](../SPECS.md).

## Quick start

```bash
npm install
```

Create `tutor-app/.env.local`:

```bash
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

For server-side document processing (`POST /api/process-document`), add the **service role** key from Supabase (Settings → API). Keep it server-only—do **not** use the `NEXT_PUBLIC_` prefix:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).
