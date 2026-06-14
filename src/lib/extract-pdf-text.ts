import { readFile } from "fs/promises";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

type PdfParseResult = {
  text: string;
  numpages: number;
};

export async function extractPdfText(filePath: string, maxChars = 14000) {
  const buffer = await readFile(filePath);
  const pdfParse = require("pdf-parse") as (data: Buffer) => Promise<PdfParseResult>;
  const parsed = await pdfParse(buffer);

  let text = (parsed.text || "").replace(/\s+/g, " ").trim();
  const truncated = text.length > maxChars;

  if (truncated) {
    text = text.substring(0, maxChars);
  }

  return {
    text,
    pages: parsed.numpages || 0,
    truncated,
    charCount: text.length,
  };
}
