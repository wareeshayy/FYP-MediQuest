import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { RAGIndex } from "@/lib/rag/types";
import { RAG_EMBEDDING_MODEL, RAG_INDEX_PATH } from "@/lib/rag/config";

let cachedIndex: RAGIndex | null = null;

export function getRAGIndexFilePath(): string {
  return path.join(process.cwd(), RAG_INDEX_PATH);
}

export async function loadRAGIndex(forceReload = false): Promise<RAGIndex | null> {
  if (cachedIndex && !forceReload) {
    return cachedIndex;
  }

  try {
    const filePath = getRAGIndexFilePath();
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as RAGIndex;

    if (!parsed?.chunks?.length) {
      return null;
    }

    cachedIndex = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveRAGIndex(index: RAGIndex): Promise<void> {
  const filePath = getRAGIndexFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(index), "utf8");
  cachedIndex = index;
}

export async function isRAGIndexAvailable(): Promise<boolean> {
  const index = await loadRAGIndex();
  return Boolean(index && index.chunks.length > 0);
}

export function createEmptyRAGIndex(dimensions: number): RAGIndex {
  return {
    version: 1,
    model: RAG_EMBEDDING_MODEL,
    dimensions,
    createdAt: new Date().toISOString(),
    chunkCount: 0,
    chunks: [],
  };
}

export async function getRAGStatus() {
  const index = await loadRAGIndex();
  return {
    available: Boolean(index?.chunks?.length),
    chunkCount: index?.chunkCount ?? 0,
    model: index?.model ?? RAG_EMBEDDING_MODEL,
    createdAt: index?.createdAt ?? null,
    materials: index
      ? [...new Set(index.chunks.map((chunk) => chunk.materialId))].sort()
      : [],
  };
}
