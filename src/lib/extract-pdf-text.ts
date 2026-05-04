import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

/**
 * Extract plain text from a PDF buffer using pdf-parse v2's Node path.
 * `CanvasFactory` from `pdf-parse/worker` registers canvas/DOM shims (e.g. DOMMatrix)
 * before PDF.js runs; required in Next.js / Node when the default browser factory is missing.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({
    data: new Uint8Array(buffer),
    CanvasFactory,
  });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}
