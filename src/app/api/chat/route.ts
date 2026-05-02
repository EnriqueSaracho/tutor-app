import { NextResponse } from "next/server";
import { embedQuery } from "@/lib/embeddings";
import { getOpenAIClient } from "@/lib/openai";
import { getChunksForRetrieval } from "@/lib/rag-store";
import { retrieveTopK } from "@/lib/retrieve";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a knowledgeable, helpful tutor.

Each user message includes retrieved excerpts from any PDFs the user has uploaded (or a note that no documents were uploaded). Treat statements in those excerpts as authoritative for the user's materials—never contradict them.

Use your general knowledge to explain ideas, provide analogies, and add useful background. If there is no useful upload or the excerpts are not relevant, answer from general knowledge when you can.

When the excerpts are relevant, ground document-specific facts in them; you may add general knowledge that does not conflict with the excerpts to make the answer clearer.

If the excerpts and your general knowledge are together insufficient, or you are too uncertain, say you don't know or that there isn't enough information. Do not invent facts.

When you combine the uploaded text with general explanation, you may add one brief sentence distinguishing what comes from their materials versus general background, only when that improves clarity or trust.`;

type ChatRequestBody = {
  message?: unknown;
};

function buildUserContent(message: string, contextLines: string): string {
  return `RETRIEVED EXCERPTS (from uploaded PDFs when available):\n${contextLines}\n\nQUESTION:\n${message}`;
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
    const queryEmbedding = await embedQuery(message);
    const storedChunks = getChunksForRetrieval();

    let contextLines: string;
    if (storedChunks.length === 0) {
      contextLines = "(No documents uploaded yet.)";
    } else {
      const top = retrieveTopK(queryEmbedding, storedChunks);
      contextLines = top
        .map((c, i) => `[${i + 1}] ${c.text}`)
        .join("\n\n");
    }

    const userContent = buildUserContent(message, contextLines);

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

    return NextResponse.json({ reply });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate reply.", details: message },
      { status: 500 },
    );
  }
}
