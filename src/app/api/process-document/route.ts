import { NextResponse } from "next/server";

import { chunkText } from "@/lib/chunk-text";
import { embedTexts } from "@/lib/embeddings";
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
    const fullText = await extractPdfText(buffer);
    console.log("[process-document] extracted text length:", fullText.length);

    const chunks = chunkText(fullText);
    console.log("[process-document] chunk count:", chunks.length);
    console.log(
      "[process-document] sample chunk:",
      chunks[0]?.slice(0, 100) ?? "(none)",
    );

    if (chunks.length > 0) {
      let embeddings: number[][];
      try {
        embeddings = await embedTexts(chunks);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json(
          { error: "Failed to generate embeddings.", details: message },
          { status: 500 },
        );
      }

      console.log("[process-document] embeddingCount:", embeddings.length);
      console.log(
        "[process-document] first embedding length:",
        embeddings[0]?.length ?? 0,
      );

      const rows = chunks.map((content, i) => ({
        document_id: id,
        content,
        embedding: embeddings[i] ?? [],
      }));

      const { error: insertError } = await supabaseAdmin
        .from("document_chunks")
        .insert(rows);

      if (insertError) {
        const msg = insertError.message.toLowerCase();
        const maybeVectorError =
          msg.includes("vector") || msg.includes("invalid input syntax");

        if (!maybeVectorError) {
          return NextResponse.json(
            { error: "Failed to save document chunks.", details: msg },
            { status: 500 },
          );
        }

        // Fallback: pgvector literal form: "[1,2,3,...]"
        const rowsAsVectorLiteral = chunks.map((content, i) => ({
          document_id: id,
          content,
          embedding: `[${(embeddings[i] ?? []).join(",")}]`,
        }));

        const { error: insertError2 } = await supabaseAdmin
          .from("document_chunks")
          .insert(rowsAsVectorLiteral);

        if (insertError2) {
          return NextResponse.json(
            {
              error: "Failed to save document chunks.",
              details: insertError2.message,
            },
            { status: 500 },
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      chunkCount: chunks.length,
      embeddingCount: chunks.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to extract PDF text.", details: message },
      { status: 500 },
    );
  }
}
