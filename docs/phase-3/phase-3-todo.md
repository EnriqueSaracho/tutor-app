# Phase 3 — Multi-tenant security & data isolation

Goal: move from a single-user / dev prototype to **per-user data isolation** as described in [`future-final-project-spec.md`](../ai-future-final-version/future-final-project-spec.md).

---

## Current state (from codebase audit)

| Area | Today |
| --- | --- |
| **Tables in use** | `documents` (`id`, `title`, `file_path`), `document_chunks` (`document_id`, `content`, `embedding`) |
| **Storage** | Bucket `documents`, paths like `uploads/{timestamp}-{filename}` |
| **RPC** | `match_document_chunks` — called from `src/lib/rag/retrieve-document-chunks.ts` |
| **Auth** | None. No session, no `user_id` on rows, no middleware |
| **DB access** | All API routes use **service role** (`createSupabaseAdmin()`), which bypasses RLS |
| **Client access** | `src/app/upload/page.tsx` and `src/app/test/page.tsx` write directly with the **anon** key |
| **Schema in repo** | No `supabase/migrations/`, no `.sql` files, no generated DB types |
| **Access control** | Knowing a `documentId` UUID is enough to chat, retrieve, or re-process that document |

**Unauthenticated API surface today:** `/api/upload`, `/api/process-document`, `/api/retrieve`, `/api/chat`.

---

## Open questions (live Supabase — please confirm)

These cannot be inferred from the repo. Answers determine migration/backfill steps.

1. **RLS today** — Is RLS enabled on `documents`, `document_chunks`, or `storage.objects` in the hosted project? Any policies already defined?
2. **Live schema** — Does `documents` already have columns the app does not set yet (`user_id`, `created_at`, `mime_type`, `status`, …)? Same for `document_chunks` (`id`, `chunk_index`, …)?
3. **`match_document_chunks` SQL** — Can you export the function definition from Supabase (SQL Editor → function definition, or `pg_dump`)? Is it `SECURITY DEFINER` or `SECURITY INVOKER`? Does it join `documents` for ownership?
4. **Storage bucket** — Is `documents` public or private? Are there storage policies on `storage.objects`?
5. **Role grants** — Do `anon` / `authenticated` roles have direct `INSERT`/`SELECT` on tables or storage, or only the service role?
6. **Auth choice** — Spec plans **Auth.js** first (Supabase Auth optional later). Stick with that for Phase 3, or use Supabase Auth so `auth.uid()` lines up with RLS?

---

## 1. Version the database (prerequisite for everything else)

Retrieval logic and schema currently live **outside source control**.

- [ ] Create `supabase/migrations/` in this repo
- [ ] Export a **baseline migration** from the live Supabase project (tables, indexes, extensions such as `vector`, existing RPCs)
- [ ] Commit `match_document_chunks.sql` (and any related grants)
- [ ] Add generated TypeScript types (e.g. `supabase gen types`) so column assumptions are explicit in code

**Why first:** You cannot safely enable RLS or review isolation if the canonical schema and RPC body are only in the Supabase dashboard.

**`match_document_chunks` requirements (when rewriting or reviewing the committed SQL):**

- Filter by `target_document_id` (already assumed by app code)
- **Also enforce ownership** — e.g. join `documents` and require `documents.user_id = auth.uid()` when called with a user JWT, or accept an explicit `user_id` param validated inside the function if the server still uses service role temporarily
- Prefer `SECURITY INVOKER` for user-scoped calls; if `SECURITY DEFINER`, document why and duplicate ownership checks inside the function
- Document which roles may `EXECUTE` the function (`service_role` only vs `authenticated`)

---

## 2. Add ownership to the data model

There is no `user_id` anywhere in application code today. Inserts only set `{ title, file_path }` on `documents` and `{ document_id, content, embedding }` on `document_chunks`.

- [ ] Add `user_id uuid not null` on `documents` (FK to `auth.users(id)` if using Supabase Auth, or to your Auth.js user table / UUID namespace if not)
- [ ] Decide chunk ownership model:
  - **Recommended:** no `user_id` on `document_chunks`; enforce via FK join to `documents.user_id` in RLS and RPC
  - **Alternative:** denormalized `user_id` on chunks for simpler policies / faster RPC (must set on every chunk insert)
- [ ] Backfill or wipe dev data after adding the column (no owner → no valid rows)
- [ ] Add index on `documents(user_id)` (optionally `(user_id, created_at desc)` for listing)
- [ ] Update app writes:
  - `src/app/api/upload/route.ts` — set `user_id` on `documents` insert
  - `src/lib/rag/insert-document-chunks.ts` — unchanged if using join-based RLS; set `user_id` if denormalized
- [ ] Change storage paths from global `uploads/...` to **`{user_id}/uploads/...`** (per spec: private buckets + user-prefixed paths)

---

## 3. Implement authentication (blocks meaningful RLS)

RLS policies need a stable user identity (`auth.uid()` or equivalent).

- [ ] Implement **Auth.js** (per spec) or Supabase Auth (if chosen in open questions above)
- [ ] Protect API routes: reject unauthenticated requests on `/api/upload`, `/api/process-document`, `/api/retrieve`, `/api/chat`
- [ ] On every route that accepts `documentId`, verify the document belongs to the signed-in user **before** read, write, delete, storage download, or RPC
- [ ] Remove or lock down dev-only direct Supabase access:
  - `src/app/upload/page.tsx` (anon client upload)
  - `src/app/test/page.tsx` (anon client insert)
- [ ] Route all uploads through authenticated API routes; use **signed URLs** for file access (private bucket)

**Note:** Service role (`createSupabaseAdmin()`) **always bypasses RLS**. Even perfect policies do not protect routes that use the admin client without explicit `user_id` checks in application code. Phase 3 should either migrate user-facing operations to a **user-scoped Supabase client** (session JWT) or keep service role only with mandatory ownership checks in every handler.

---

## 4. Enable RLS on all tables

Target objects:

| Object | Enable RLS |
| --- | --- |
| `documents` | Yes |
| `document_chunks` | Yes |
| `storage.objects` (bucket `documents`) | Yes |

- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for each table above
- [ ] Revoke overly broad default grants if the dashboard created permissive policies during development
- [ ] Ensure `service_role` usage is limited to trusted server paths that perform their own authorization

---

## 5. Add `user_id` / ownership policies

Assumes Supabase Auth with `auth.uid()` matching `documents.user_id`. Adjust if using Auth.js with a different JWT claim.

### `documents`

- [ ] **SELECT** — `user_id = auth.uid()`
- [ ] **INSERT** — `WITH CHECK (user_id = auth.uid())`
- [ ] **UPDATE** — `user_id = auth.uid()` (both `USING` and `WITH CHECK`)
- [ ] **DELETE** — `user_id = auth.uid()`

### `document_chunks` (join-based)

- [ ] **SELECT / INSERT / UPDATE / DELETE** — `EXISTS (SELECT 1 FROM documents d WHERE d.id = document_chunks.document_id AND d.user_id = auth.uid())`

### Storage bucket `documents`

- [ ] Bucket set to **private**
- [ ] **INSERT / SELECT / UPDATE / DELETE** on `storage.objects` where bucket id is `documents` and the first path segment equals `auth.uid()::text` (matches `{user_id}/uploads/...` convention)

### `match_document_chunks` RPC

- [ ] Ownership enforced inside the function (see section 1), not only by `target_document_id`

---

## 6. Verify data isolation

Manual and automated checks that user A cannot access user B's data.

- [ ] **Cross-tenant API tests:** user A uploads doc → user B cannot call `/api/chat`, `/api/retrieve`, or `/api/process-document` with A's `documentId` (expect 403/404)
- [ ] **Direct DB / anon client:** with user B's session JWT, `SELECT` on A's rows returns zero rows
- [ ] **Storage:** user B cannot read or list objects under A's `{user_id}/` prefix
- [ ] **RPC:** `match_document_chunks` returns no rows (or errors) when `target_document_id` belongs to another user
- [ ] **ID enumeration:** confirm guessing UUIDs does not leak content (consistent 404/403, no timing side channels in error messages)
- [ ] **Regression:** remove or gate unauthenticated test pages so production builds cannot write via anon key

---

## Suggested order of work

1. Answer open questions + export live schema → `supabase/migrations/` (including `match_document_chunks`)
2. Add `user_id` + storage path convention + app writes
3. Ship auth + API route guards
4. Enable RLS + policies (tables + storage + RPC ownership)
5. Run isolation verification checklist
6. Optionally: user-scoped Supabase client instead of service role for user-facing routes

---

## Biggest remaining risk (ChatGPT recommendation)

`match_document_chunks` is not in source control — retrieval logic partially exists outside the repo, which becomes dangerous fast. Covered in **section 1** above; treat it as the first migration commit, not a late cleanup.
