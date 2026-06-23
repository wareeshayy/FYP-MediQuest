import { NextResponse } from "next/server";
import { getRAGStatus } from "@/lib/rag/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getRAGStatus();
  return NextResponse.json(status);
}
