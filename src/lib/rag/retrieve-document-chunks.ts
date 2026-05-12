import { embedQuery } from "@/lib/embeddings";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type RetrievedDocumentChunk = {
  content: string;
  similarity: number;
};

type RetrieveDocumentChunksParams = {
  query: string;
  documentId: string;
  matchCount?: number;
};

type MatchDocumentChunksRow = {
  content?: unknown;
  similarity?: unknown;
};

export async function retrieveDocumentChunks({
  query,
  documentId,
  matchCount = 5,
}: RetrieveDocumentChunksParams): Promise<RetrievedDocumentChunk[]> {
  const supabaseAdmin = createSupabaseAdmin();

  let embedding: number[];
  try {
    embedding = await embedQuery(query);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    throw new Error("Failed to embed query.", { cause: message });
  }

  // The checked-in app code assumes this RPC accepts these parameter names
  // and returns rows with `content` plus `similarity`.
  const { data, error } = await supabaseAdmin.rpc("match_document_chunks", {
    query_embedding: embedding,
    match_count: matchCount,
    target_document_id: documentId,
  });

  if (error) {
    throw new Error("Retrieval failed.", { cause: error.message });
  }

  return Array.isArray(data)
    ? data.map((row) => ({
        content: String((row as MatchDocumentChunksRow).content ?? ""),
        similarity: Number((row as MatchDocumentChunksRow).similarity ?? 0),
      }))
    : [];
}
