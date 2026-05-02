const CHUNK_SIZE = 800;
const OVERLAP = 100;

/**
 * Normalize whitespace and split text into overlapping chunks (~800 chars, ~100 overlap).
 */
export function chunkText(raw: string): string[] {
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_SIZE, normalized.length);
    const slice = normalized.slice(start, end).trim();
    if (slice.length > 0) chunks.push(slice);
    if (end >= normalized.length) break;
    start = end - OVERLAP;
    if (start < 0) start = 0;
  }
  return chunks;
}
