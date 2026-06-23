import { InferenceClient } from "@huggingface/inference";
import { getHuggingFaceApiKey } from "@/lib/huggingface";
import { RAG_EMBEDDING_MODEL } from "@/lib/rag/config";

function meanPoolEmbedding(raw: number[] | number[][]): number[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  if (typeof raw[0] === "number") {
    return raw as number[];
  }

  const vectors = raw as number[][];
  const dimensions = vectors[0]?.length ?? 0;
  if (dimensions === 0) return [];

  const pooled = new Array(dimensions).fill(0);
  for (const vector of vectors) {
    for (let i = 0; i < dimensions; i += 1) {
      pooled[i] += vector[i] ?? 0;
    }
  }

  return pooled.map((value) => value / vectors.length);
}

function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

export async function embedText(text: string): Promise<number[]> {
  const apiKey = getHuggingFaceApiKey();
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is required for RAG embeddings.");
  }

  const client = new InferenceClient(apiKey);
  const result = await client.featureExtraction({
    model: RAG_EMBEDDING_MODEL,
    inputs: text.slice(0, 8000),
  });

  return normalizeVector(meanPoolEmbedding(result as number[] | number[][]));
}

export async function embedTexts(
  texts: string[],
  delayMs = 350
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += 1) {
    embeddings.push(await embedText(texts[i]));
    if (i < texts.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return embeddings;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
  }

  return dot;
}
