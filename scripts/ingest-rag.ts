import { readFileSync } from "fs";
import { resolve } from "path";
import { ingestReadingMaterialsForRAG } from "../src/lib/rag/ingest";

function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    console.warn("Could not load .env.local — ensure HUGGINGFACE_API_KEY is set.");
  }
}

async function main() {
  loadEnvLocal();

  console.log("🚀 Starting RAG ingest for MediQuest reading materials...\n");
  const result = await ingestReadingMaterialsForRAG();

  console.log("\n✅ RAG ingest complete");
  console.log(`   Materials: ${result.materialCount}`);
  console.log(`   Chunks:    ${result.chunkCount}`);
  console.log(`   Index:     ${result.indexPath}`);
  for (const material of result.materials) {
    console.log(`   - ${material.title}: ${material.chunks} chunks`);
  }
}

main().catch((error) => {
  console.error("❌ RAG ingest failed:", error);
  process.exit(1);
});
