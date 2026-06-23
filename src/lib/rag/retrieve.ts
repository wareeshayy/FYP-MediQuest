import type { RetrievedChunk, RetrieveOptions } from "@/lib/rag/types";
import { cosineSimilarity, embedText } from "@/lib/rag/embeddings";
import { isRAGEnabled, RAG_CHAT_TOP_K, RAG_DEFAULT_TOP_K } from "@/lib/rag/config";
import { loadRAGIndex } from "@/lib/rag/store";

export async function retrieveChunks(
  options: RetrieveOptions
): Promise<RetrievedChunk[]> {
  if (!isRAGEnabled()) {
    return [];
  }

  const index = await loadRAGIndex();
  if (!index?.chunks?.length) {
    return [];
  }

  const query = options.query.trim();
  if (!query) {
    return [];
  }

  const queryEmbedding = await embedText(query);
  const topK = options.topK ?? RAG_DEFAULT_TOP_K;

  const candidates = options.materialId
    ? index.chunks.filter((chunk) => chunk.materialId === options.materialId)
    : index.chunks;

  if (candidates.length === 0) {
    return [];
  }

  const scored = candidates
    .map((chunk) => ({
      id: chunk.id,
      materialId: chunk.materialId,
      materialTitle: chunk.materialTitle,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.filter((chunk) => chunk.score > 0.15);
}

export async function retrieveChunksForChat(
  query: string,
  materialId?: string
): Promise<RetrievedChunk[]> {
  return retrieveChunks({
    query,
    materialId,
    topK: RAG_CHAT_TOP_K,
  });
}
