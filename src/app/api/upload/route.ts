import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { chunkText } from "@/lib/chunk-text";
import { extractPdfText } from "@/lib/extract-pdf-text";
import { embedTexts } from "@/lib/embeddings";
import { insertDocumentChunks } from "@/lib/rag/insert-document-chunks";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const STORAGE_BUCKET = "documents";

function isPdfFile(file: File): boolean {
  if (file.type === "application/pdf") return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".pdf");
}

async function rollbackUploadedDocument(
  supabaseAdmin: SupabaseClient,
  storagePath: string,
  documentRowId: string | null,
): Promise<void> {
  if (documentRowId) {
    await supabaseAdmin.from("documents").delete().eq("id", documentRowId);
  }
  await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([storagePath]);
}

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 400 },
    );
  }

  const entry = formData.get("file");
  if (!(entry instanceof File)) {
    return NextResponse.json(
      { error: 'Missing file field "file".' },
      { status: 400 },
    );
  }

  if (!isPdfFile(entry)) {
    return NextResponse.json(
      { error: "Only PDF files are accepted." },
      { status: 400 },
    );
  }

  if (entry.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 10MB)." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await entry.arrayBuffer());

  let text: string;
  try {
    text = await extractPdfText(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to extract PDF text.", details: message },
      { status: 500 },
    );
  }

  if (!text) {
    return NextResponse.json(
      { error: "No text could be extracted from this PDF." },
      { status: 400 },
    );
  }

  const chunkStrings = chunkText(text);
  if (chunkStrings.length === 0) {
    return NextResponse.json(
      { error: "No chunks produced from extracted text." },
      { status: 400 },
    );
  }

  let embeddings: number[][];
  try {
    embeddings = await embedTexts(chunkStrings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate embeddings.", details: message },
      { status: 500 },
    );
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdmin();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Server misconfiguration.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const safeName = entry.name.replaceAll("/", "_");
  const storagePath = `uploads/${Date.now()}-${safeName}`;

  const { error: storageError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: entry.type || "application/pdf",
      upsert: false,
    });

  if (storageError) {
    return NextResponse.json(
      {
        error: "Failed to upload file to storage.",
        details: storageError.message,
      },
      { status: 500 },
    );
  }

  const { data: insertedDoc, error: insertDocError } = await supabaseAdmin
    .from("documents")
    .insert({ title: entry.name, file_path: storagePath })
    .select("id")
    .single();

  if (insertDocError || !insertedDoc?.id) {
    await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return NextResponse.json(
      {
        error: "Failed to save document record.",
        details: insertDocError?.message ?? "No id returned.",
      },
      { status: 500 },
    );
  }

  const documentId = String(insertedDoc.id);

  const chunkInsert = await insertDocumentChunks(
    supabaseAdmin,
    documentId,
    chunkStrings,
    embeddings,
  );

  if (!chunkInsert.ok) {
    await rollbackUploadedDocument(supabaseAdmin, storagePath, documentId);
    return NextResponse.json(
      {
        error: chunkInsert.message,
        ...(chunkInsert.details ? { details: chunkInsert.details } : {}),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    text,
    documentId,
    chunkCount: chunkStrings.length,
  });
}
