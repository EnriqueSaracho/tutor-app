import type { SupabaseClient } from "@supabase/supabase-js";

export type InsertDocumentChunksResult =
  | { ok: true }
  | { ok: false; message: string; details?: string };

/**
 * Inserts rows into `document_chunks` for pgvector, matching the behavior of
 * the former inline logic in `process-document`: try numeric vectors first,
 * then fall back to pgvector literal strings when the driver/DB rejects them.
 */
export async function insertDocumentChunks(
  supabaseAdmin: SupabaseClient,
  documentId: string,
  chunks: string[],
  embeddings: number[][],
): Promise<InsertDocumentChunksResult> {
  if (chunks.length === 0) {
    return { ok: true };
  }

  const rows = chunks.map((content, i) => ({
    document_id: documentId,
    content,
    embedding: embeddings[i] ?? [],
  }));

  const { error: insertError } = await supabaseAdmin
    .from("document_chunks")
    .insert(rows);

  if (!insertError) {
    return { ok: true };
  }

  const msg = insertError.message.toLowerCase();
  const maybeVectorError =
    msg.includes("vector") || msg.includes("invalid input syntax");

  if (!maybeVectorError) {
    return {
      ok: false,
      message: "Failed to save document chunks.",
      details: insertError.message,
    };
  }

  const rowsAsVectorLiteral = chunks.map((content, i) => ({
    document_id: documentId,
    content,
    embedding: `[${(embeddings[i] ?? []).join(",")}]`,
  }));

  const { error: insertError2 } = await supabaseAdmin
    .from("document_chunks")
    .insert(rowsAsVectorLiteral);

  if (insertError2) {
    return {
      ok: false,
      message: "Failed to save document chunks.",
      details: insertError2.message,
    };
  }

  return { ok: true };
}
