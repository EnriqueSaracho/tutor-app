import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Set it in .env.local.");
  }

  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

