import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getReadingMaterialById } from "@/lib/reading-materials";
import { extractPdfText } from "@/lib/extract-pdf-text";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materialId } = body;

    if (!materialId) {
      return NextResponse.json({ error: "Material ID is required" }, { status: 400 });
    }

    const material = getReadingMaterialById(materialId);
    if (!material) {
      return NextResponse.json({ error: "Reading material not found" }, { status: 404 });
    }

    const filePath = path.join(
      process.cwd(),
      "public",
      material.filePath.replace(/^\//, "")
    );

    const { text, pages, truncated, charCount } = await extractPdfText(filePath);

    if (!text || text.length < 100) {
      return NextResponse.json(
        { error: "Could not extract enough text from this PDF. Try another material." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      materialId: material.id,
      title: material.title,
      text,
      pages,
      truncated,
      charCount,
    });
  } catch (error: unknown) {
    console.error("Error extracting reading material:", error);
    const message = error instanceof Error ? error.message : "Failed to extract PDF text";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
