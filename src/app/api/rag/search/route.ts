import { NextRequest, NextResponse } from "next/server";
import { retrieveChunks } from "@/lib/rag/retrieve";
import { buildRAGContext } from "@/lib/rag/buildContext";
import { isRAGIndexAvailable } from "@/lib/rag/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, materialId, topK } = body;

    if (!query?.trim()) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    if (!(await isRAGIndexAvailable())) {
      return NextResponse.json(
        {
          error: "RAG index not found. Run: npm run rag:ingest",
          available: false,
        },
        { status: 404 }
      );
    }

    const chunks = await retrieveChunks({
      query: String(query),
      materialId: materialId ? String(materialId) : undefined,
      topK: topK ? Number(topK) : undefined,
    });

    return NextResponse.json({
      available: true,
      count: chunks.length,
      chunks,
      context: buildRAGContext(chunks),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "RAG search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
