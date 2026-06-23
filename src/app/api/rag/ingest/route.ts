import { NextRequest, NextResponse } from "next/server";
import { ingestReadingMaterialsForRAG } from "@/lib/rag/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.RAG_INGEST_SECRET;
  if (!secret) return false;

  const headerSecret = request.headers.get("x-rag-ingest-secret");
  const querySecret = request.nextUrl.searchParams.get("secret");
  return headerSecret === secret || querySecret === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Set RAG_INGEST_SECRET and pass it in x-rag-ingest-secret header." },
      { status: 401 }
    );
  }

  try {
    const result = await ingestReadingMaterialsForRAG();
    return NextResponse.json({
      success: true,
      message: "RAG index built from reading material PDFs.",
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "RAG ingest failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
