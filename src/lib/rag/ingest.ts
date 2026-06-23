import path from "path";
import { randomUUID } from "crypto";
import { READING_MATERIALS } from "@/lib/reading-materials";
import { extractPdfText } from "@/lib/extract-pdf-text";
import { chunkText } from "@/lib/rag/chunkText";
import { embedTexts } from "@/lib/rag/embeddings";
import { createEmptyRAGIndex, saveRAGIndex } from "@/lib/rag/store";
import type { RAGChunkRecord } from "@/lib/rag/types";

export interface IngestRAGResult {
  materialCount: number;
  chunkCount: number;
  indexPath: string;
  materials: Array<{ id: string; title: string; chunks: number }>;
}

export async function ingestReadingMaterialsForRAG(): Promise<IngestRAGResult> {
  const allChunks: RAGChunkRecord[] = [];
  const materialStats: Array<{ id: string; title: string; chunks: number }> = [];

  for (const material of READING_MATERIALS) {
    const filePath = path.join(
      process.cwd(),
      "public",
      material.filePath.replace(/^\//, "")
    );

    console.log(`📄 Processing: ${material.title}`);
    const { text } = await extractPdfText(filePath, 500_000);
    const textChunks = chunkText(text);

    if (!textChunks.length) {
      console.warn(`⚠️ No chunks for ${material.id}`);
      continue;
    }

    console.log(`   ↳ ${textChunks.length} chunks — embedding...`);
    const embeddings = await embedTexts(
      textChunks.map((chunk) => chunk.content),
      300
    );

    const records: RAGChunkRecord[] = textChunks.map((chunk, index) => ({
      id: randomUUID(),
      materialId: material.id,
      materialTitle: material.title,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      embedding: embeddings[index],
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
    }));

    allChunks.push(...records);
    materialStats.push({
      id: material.id,
      title: material.title,
      chunks: records.length,
    });
  }

  if (!allChunks.length) {
    throw new Error("No RAG chunks were created from reading materials.");
  }

  const index = createEmptyRAGIndex(allChunks[0].embedding.length);
  index.chunks = allChunks;
  index.chunkCount = allChunks.length;

  await saveRAGIndex(index);

  return {
    materialCount: materialStats.length,
    chunkCount: allChunks.length,
    indexPath: "data/rag/chunks.json",
    materials: materialStats,
  };
}
