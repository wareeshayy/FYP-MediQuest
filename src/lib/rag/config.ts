export const RAG_CHUNK_SIZE = 1800;
export const RAG_CHUNK_OVERLAP = 200;
export const RAG_DEFAULT_TOP_K = 6;
export const RAG_CHAT_TOP_K = 4;
export const RAG_EMBEDDING_MODEL =
  process.env.RAG_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";
export const RAG_INDEX_PATH = "data/rag/chunks.json";

export function isRAGEnabled(): boolean {
  return process.env.RAG_ENABLED !== "false";
}
