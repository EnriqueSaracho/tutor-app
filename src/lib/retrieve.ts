import { cosineSimilarity } from "@/lib/cosine-similarity";
import type { StoredChunk } from "@/lib/rag-store";

export const TOP_K = 5;

export function retrieveTopK(
  queryEmbedding: number[],
  storedChunks: StoredChunk[],
  k: number = TOP_K,
): StoredChunk[] {
  if (storedChunks.length === 0) return [];

  const scored = storedChunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.chunk);
}
