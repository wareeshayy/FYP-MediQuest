/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
    // Include RAG index in serverless bundles (Vercel cannot read untraced files)
    outputFileTracingIncludes: {
      "/api/rag/status": ["./data/rag/chunks.json"],
      "/api/rag/search": ["./data/rag/chunks.json"],
      "/api/rag/ingest": ["./data/rag/chunks.json"],
      "/api/chat": ["./data/rag/chunks.json"],
      "/api/generate-questions": ["./data/rag/chunks.json"],
    },
  },
};

export default nextConfig;
