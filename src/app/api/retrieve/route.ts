import { NextResponse } from "next/server";

import { embedQuery } from "@/lib/embeddings";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

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

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdmin();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Server misconfiguration.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  console.log("[retrieve] query:", query);

  let embedding: number[];
  try {
    embedding = await embedQuery(query);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to embed query.", details: message },
      { status: 500 },
    );
  }

  console.log("[retrieve] embedding length:", embedding.length);

  const { data, error } = await supabaseAdmin.rpc("match_document_chunks", {
    query_embedding: embedding,
    match_count: topK,
    target_document_id: documentId,
  });

  if (error) {
    return NextResponse.json(
      { error: "Retrieval failed.", details: error.message },
      { status: 500 },
    );
  }

  const results = Array.isArray(data)
    ? data.map((row) => ({
        content: String((row as { content?: unknown }).content ?? ""),
        similarity: Number((row as { similarity?: unknown }).similarity ?? 0),
      }))
    : [];

  console.log("[retrieve] results:", results.length);

  return NextResponse.json({ success: true, results });
}

