import type { RetrievedChunk } from "@/lib/rag/types";

export function buildRAGContext(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return "";

  const sections = chunks.map((chunk, index) => {
    const score = (chunk.score * 100).toFixed(1);
    return `[Source ${index + 1}: ${chunk.materialTitle} | relevance ${score}%]
${chunk.content}`;
  });

  return `--- RAG RETRIEVED MEDICAL SOURCES ---
Use ONLY the following retrieved excerpts from verified USMLE study PDFs.
If the answer is not supported by these excerpts, say it is not found in the study materials.

${sections.join("\n\n")}
--- END RAG SOURCES ---`;
}
