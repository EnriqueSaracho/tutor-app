import { NextResponse } from "next/server";
import { embedQuery } from "@/lib/embeddings";
import { getOpenAIClient } from "@/lib/openai";
import { getChunksForRetrieval, type StoredChunk } from "@/lib/rag-store";
import { retrieveTopK } from "@/lib/retrieve";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a knowledgeable, helpful tutor.

If the user's message includes a "RETRIEVED EXCERPTS" section, treat those excerpts as authoritative for the user's uploaded materials—never contradict them. Ground document-specific facts in the excerpts when they apply.

If the user's message does not include "RETRIEVED EXCERPTS", answer using general knowledge only. Do not claim the answer is grounded in the user's documents or uploads.

Use your general knowledge to explain ideas, provide analogies, and add useful background when excerpts are present, as long as it does not conflict with the excerpts.

When excerpts are present but insufficient, or you are too uncertain, say you don't know or that there isn't enough information. Do not invent document-specific facts.

When excerpts are present and you combine them with general explanation, you may add one brief sentence distinguishing what comes from their materials versus general background, only when that improves clarity or trust.`;

type ChatRequestBody = {
  message?: unknown;
};

function buildUserContent(message: string, contextLines?: string[] | null): string {
  const questionBlock = `QUESTION:\n${message}`;
  if (!contextLines?.length) {
    return questionBlock;
  }
  const block = contextLines
    .map((line, i) => `[${i + 1}] ${line}`)
    .join("\n\n");
  return `RETRIEVED EXCERPTS (from uploaded PDFs when available):\n${block}\n\n${questionBlock}`;
}

export async function POST(req: Request) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const message =
    typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json(
      { error: "Missing message." },
      { status: 400 },
    );
  }

  try {
    const storedChunks = getChunksForRetrieval();
    /** Temporary debug: distinguish empty in-memory store vs chunks gated out by similarity. */
    const indexedChunkCount = storedChunks.length;

    let chunks: StoredChunk[] = [];
    let topScores: number[] = [];
    let retrievalBestScore: number | null = null;

    if (storedChunks.length > 0) {
      const queryEmbedding = await embedQuery(message);
      const result = retrieveTopK(queryEmbedding, storedChunks);
      chunks = result.chunks;
      topScores = result.scores;
      retrievalBestScore = result.bestScore;
    }

    const usedRAG = chunks.length > 0;
    const userContent = usedRAG
      ? buildUserContent(
          message,
          chunks.map((c) => c.text),
        )
      : buildUserContent(message);

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!reply) {
      return NextResponse.json(
        { error: "Empty reply from model." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      reply,
      usedRAG,
      retrievedCount: chunks.length,
      indexedChunkCount,
      ...(usedRAG ? { topScores } : {}),
      ...(!usedRAG &&
      indexedChunkCount > 0 &&
      retrievalBestScore !== null
        ? { bestScore: retrievalBestScore }
        : {}),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate reply.", details: message },
      { status: 500 },
    );
  }
}
