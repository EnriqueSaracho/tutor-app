import { getOpenAIClient } from "@/lib/openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
/** OpenAI allows many inputs per request; batch to stay well under limits. */
const BATCH_SIZE = 100;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const openai = getOpenAIClient();
  const all: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    const ordered = res.data
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
    all.push(...ordered);
  }

  return all;
}

export async function embedQuery(text: string): Promise<number[]> {
  const vectors = await embedTexts([text]);
  return vectors[0] ?? [];
}
