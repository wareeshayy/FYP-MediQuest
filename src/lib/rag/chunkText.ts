import { RAG_CHUNK_OVERLAP, RAG_CHUNK_SIZE } from "@/lib/rag/config";

export interface TextChunk {
  content: string;
  charStart: number;
  charEnd: number;
  chunkIndex: number;
}

/**
 * Split long PDF text into overlapping chunks for embedding + retrieval.
 */
export function chunkText(
  text: string,
  chunkSize = RAG_CHUNK_SIZE,
  overlap = RAG_CHUNK_OVERLAP
): TextChunk[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    const content = normalized.slice(start, end).trim();

    if (content.length >= 80) {
      chunks.push({
        content,
        charStart: start,
        charEnd: end,
        chunkIndex: index,
      });
      index += 1;
    }

    if (end >= normalized.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}
