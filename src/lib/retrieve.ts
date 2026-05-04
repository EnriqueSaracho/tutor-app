import { cosineSimilarity } from "@/lib/cosine-similarity";
import {
  FALLBACK_MIN_SCORE,
  SIMILARITY_THRESHOLD,
} from "@/lib/rag-config";
import type { StoredChunk } from "@/lib/rag-store";

export const TOP_K = 5;
export { FALLBACK_MIN_SCORE, SIMILARITY_THRESHOLD };

type ScoredChunk = { chunk: StoredChunk; score: number };

export function retrieveTopK(
  queryEmbedding: number[],
  storedChunks: StoredChunk[],
  k: number = TOP_K,
): {
  chunks: StoredChunk[];
  scores: number[];
  /** Highest cosine similarity among all indexed chunks (same as sorted[0].score). For debug responses only. */
  bestScore: number | null;
} {
  if (storedChunks.length === 0) {
    return { chunks: [], scores: [], bestScore: null };
  }

  const scored: ScoredChunk[] = storedChunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const bestScore = sorted[0]!.score;
  const filtered = sorted.filter((s) => s.score >= SIMILARITY_THRESHOLD);

  if (filtered.length > 0) {
    const picked = filtered.slice(0, k);
    return {
      chunks: picked.map((s) => s.chunk),
      scores: picked.map((s) => s.score),
      bestScore,
    };
  }

  if (sorted.length > 0) {
    const best = sorted[0];
    if (best.score >= FALLBACK_MIN_SCORE) {
      return {
        chunks: [best.chunk],
        scores: [best.score],
        bestScore,
      };
    }
  }

  return { chunks: [], scores: [], bestScore };
}
