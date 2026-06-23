export interface RAGChunkRecord {
  id: string;
  materialId: string;
  materialTitle: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  charStart: number;
  charEnd: number;
}

export interface RAGIndex {
  version: 1;
  model: string;
  dimensions: number;
  createdAt: string;
  chunkCount: number;
  chunks: RAGChunkRecord[];
}

export interface RetrievedChunk {
  id: string;
  materialId: string;
  materialTitle: string;
  content: string;
  score: number;
  chunkIndex: number;
}

export interface RetrieveOptions {
  query: string;
  materialId?: string;
  topK?: number;
}
