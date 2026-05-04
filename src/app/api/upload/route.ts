import { NextResponse } from "next/server";

import { chunkText } from "@/lib/chunk-text";
import { extractPdfText } from "@/lib/extract-pdf-text";
import { embedTexts } from "@/lib/embeddings";
import { addDocument } from "@/lib/rag-store";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

function isPdfFile(file: File): boolean {
  if (file.type === "application/pdf") return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".pdf");
}

export async function POST(req: Request) {
  // try to parse the request as a FormData object
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 400 },
    );
  }

  // get the file from the form data
  const entry = formData.get("file");
  // check if the file is a File object
  if (!(entry instanceof File)) {
    return NextResponse.json(
      { error: "Missing file field \"file\"." },
      { status: 400 },
    );
  }

  // check if the file is a PDF file
  if (!isPdfFile(entry)) {
    return NextResponse.json(
      { error: "Only PDF files are accepted." },
      { status: 400 },
    );
  }

  // check if the file is too large
  if (entry.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 10MB)." },
      { status: 400 },
    );
  }

  // convert the file to a buffer
  const buffer = Buffer.from(await entry.arrayBuffer());

  try {
    const text = await extractPdfText(buffer);
    if (!text) {
      return NextResponse.json(
        { error: "No text could be extracted from this PDF." },
        { status: 400 },
      );
    }

    // chunk the text into smaller chunks
    const chunkStrings = chunkText(text);
    if (chunkStrings.length === 0) {
      return NextResponse.json(
        { error: "No chunks produced from extracted text." },
        { status: 400 },
      );
    }

    // embed the chunks
    const embeddings = await embedTexts(chunkStrings);
    // add the embeddings to the chunks
    const chunksWithEmbeddings = chunkStrings.map((t, i) => ({
      text: t,
      embedding: embeddings[i]!,
    }));

    // add the document to the database
    const documentId = addDocument(text, chunksWithEmbeddings);
    
    // return the document id, text, and chunk count
    return NextResponse.json({
      text,
      documentId,
      chunkCount: chunkStrings.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to process PDF.", details: message },
      { status: 500 },
    );
  }
}
