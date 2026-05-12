import { NextResponse } from "next/server";

import { retrieveDocumentChunks } from "@/lib/rag/retrieve-document-chunks";

export const runtime = "nodejs";

type RetrieveBody = {
  query?: unknown;
  documentId?: unknown;
  topK?: unknown;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getErrorPayload(err: unknown): { error: string; details?: string } {
  if (!(err instanceof Error)) {
    return { error: "Retrieval failed." };
  }

  const details =
    typeof err.cause === "string"
      ? err.cause
      : err.cause instanceof Error
        ? err.cause.message
        : undefined;

  return details
    ? { error: err.message, details }
    : { error: err.message };
}

export async function POST(req: Request) {
  let body: RetrieveBody;
  try {
    body = (await req.json()) as RetrieveBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({ error: "Missing query." }, { status: 400 });
  }

  const documentId =
    typeof body.documentId === "string" ? body.documentId.trim() : "";
  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId." }, { status: 400 });
  }
  if (!isUuid(documentId)) {
    return NextResponse.json({ error: "Invalid documentId." }, { status: 400 });
  }

  const rawTopK = body.topK;
  const topK =
    typeof rawTopK === "number" && Number.isFinite(rawTopK)
      ? Math.min(20, Math.max(1, Math.floor(rawTopK)))
      : 5;

  console.log("[retrieve] query:", query);

  try {
    const results = await retrieveDocumentChunks({
      query,
      documentId,
      matchCount: topK,
    });

    console.log("[retrieve] results:", results.length);

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json(
      getErrorPayload(err),
      { status: 500 },
    );
  }
}

