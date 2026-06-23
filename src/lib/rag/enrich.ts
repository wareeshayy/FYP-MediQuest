import { buildRAGContext } from "@/lib/rag/buildContext";
import { isRAGEnabled } from "@/lib/rag/config";
import { retrieveChunks, retrieveChunksForChat } from "@/lib/rag/retrieve";
import { isRAGIndexAvailable } from "@/lib/rag/store";

/**
 * Enrich quiz content with RAG — only for reading-material flows.
 * Falls back to existingContent when RAG is unavailable.
 */
export async function enrichQuizContentWithRAG(options: {
  topic: string;
  materialId?: string;
  sourceType?: string;
  existingContent?: string;
}): Promise<string | undefined> {
  const shouldUseRag =
    isRAGEnabled() &&
    (options.sourceType === "reading-material" || Boolean(options.materialId));

  if (!shouldUseRag) {
    return options.existingContent;
  }

  try {
    if (!(await isRAGIndexAvailable())) {
      return options.existingContent;
    }

    const chunks = await retrieveChunks({
      query: `${options.topic} ${options.existingContent?.slice(0, 500) ?? ""}`.trim(),
      materialId: options.materialId,
      topK: 6,
    });

    if (!chunks.length) {
      return options.existingContent;
    }

    return buildRAGContext(chunks);
  } catch (error) {
    console.warn("RAG quiz enrichment skipped:", error);
    return options.existingContent;
  }
}

/**
 * Enrich chat context with RAG — appends to any existing context.
 * Falls back silently if RAG is unavailable.
 */
export async function enrichChatContextWithRAG(options: {
  query: string;
  existingContext?: string;
  materialId?: string;
}): Promise<string | undefined> {
  if (!isRAGEnabled()) {
    return options.existingContext;
  }

  try {
    if (!(await isRAGIndexAvailable())) {
      return options.existingContext;
    }

    const chunks = await retrieveChunksForChat(options.query, options.materialId);
    if (!chunks.length) {
      return options.existingContext;
    }

    const ragContext = buildRAGContext(chunks);
    return options.existingContext
      ? `${options.existingContext}\n\n${ragContext}`
      : ragContext;
  } catch (error) {
    console.warn("RAG chat enrichment skipped:", error);
    return options.existingContext;
  }
}
