import { NextResponse } from "next/server";

import { extractPdfText } from "@/lib/extract-pdf-text";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type ProcessDocumentBody = {
  documentId?: unknown;
};

export async function POST(req: Request) {
  let body: ProcessDocumentBody;
  try {
    body = (await req.json()) as ProcessDocumentBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const documentId = body.documentId;
  if (typeof documentId !== "string" || documentId.trim() === "") {
    return NextResponse.json({ error: "Missing documentId." }, { status: 400 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdmin();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Server misconfiguration.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const id = documentId.trim();

  const { data: doc, error: docError } = await supabaseAdmin
    .from("documents")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();

  if (docError) {
    return NextResponse.json(
      { error: "Failed to load document." },
      { status: 500 },
    );
  }

  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const filePath = doc.file_path;
  if (typeof filePath !== "string" || filePath.length === 0) {
    return NextResponse.json(
      { error: "Document has no file_path." },
      { status: 500 },
    );
  }

  const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
    .from("documents")
    .download(filePath);

  if (downloadError || !fileBlob) {
    return NextResponse.json(
      { error: "Failed to download file." },
      { status: 500 },
    );
  }

  const buffer = Buffer.from(await fileBlob.arrayBuffer());

  try {
    const text = await extractPdfText(buffer);
    console.log("[process-document] extracted text length:", text.length);
    return NextResponse.json({ success: true, textLength: text.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to extract PDF text.", details: message },
      { status: 500 },
    );
  }
}
