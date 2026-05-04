/**
 * Server-only RAG retrieval gates (read at module load). Override via env without code changes.
 *
 * - RAG_SIMILARITY_THRESHOLD — primary gate: chunks must be >= this to enter the top-K list (default 0.7).
 * - RAG_FALLBACK_MIN_SCORE — if none pass the primary gate, the single best chunk is used only if
 *   its score is >= this floor (default 0.62).
 *
 * Non-finite or out-of-range values fall back to defaults. Values are clamped to [0, 1].
 */
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;
const DEFAULT_FALLBACK_MIN_SCORE = 0.62;

function parseEnvThreshold(name: string, defaultValue: number): number {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === "") {
    return defaultValue;
  }
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) {
    return defaultValue;
  }
  return Math.min(1, Math.max(0, n));
}

export const SIMILARITY_THRESHOLD = parseEnvThreshold(
  "RAG_SIMILARITY_THRESHOLD",
  DEFAULT_SIMILARITY_THRESHOLD,
);

export const FALLBACK_MIN_SCORE = parseEnvThreshold(
  "RAG_FALLBACK_MIN_SCORE",
  DEFAULT_FALLBACK_MIN_SCORE,
);
