import { NON_MEDICAL_QUIZ_ERROR } from "@/lib/promptBuilder";

/**
 * Returns a single short user-facing error — never troubleshooting blocks.
 */
export function formatQuizError(message: string): string {
  let msg = stripDiagnosticBlocks(message).trim();
  if (!msg) return "Failed to create quiz. Please try again.";

  const lower = msg.toLowerCase();

  if (isNonMedicalQuizError(lower)) {
    return NON_MEDICAL_QUIZ_ERROR;
  }
  if (lower.includes("please select a reading material")) {
    return "Please select a reading material PDF.";
  }
  if (lower.includes("topics_source_type_check")) {
    return "Invalid content source. Use Reading Material or Text/Notes.";
  }
  if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("429")) {
    return "Rate limit reached. Wait a few minutes and try again.";
  }
  if (lower.includes("groq") || lower.includes("api key") || lower.includes("api_key")) {
    return "AI service not configured. Check GROQ_API_KEY in .env.local.";
  }
  if (lower.includes("supabase") || lower.includes("service_role")) {
    return "Database not configured. Check Supabase keys in .env.local.";
  }
  if (lower.includes("logged in") || lower.includes("auth")) {
    return "Please sign in and try again.";
  }
  if (lower.includes("extract") && lower.includes("pdf")) {
    return "Could not read the PDF. Try another file or Reading Material.";
  }
  if (lower.includes("parse") && lower.includes("ai")) {
    return "AI response error. Please try again.";
  }
  if (lower.includes("econnrefused") || lower.includes("fetch failed")) {
    return "Cannot reach AI service. Check your connection and try again.";
  }

  const firstLine = msg.split("\n")[0].replace(/^error:\s*/i, "").trim();
  if (firstLine.length <= 120) return firstLine;
  return `${firstLine.slice(0, 117)}...`;
}

function isNonMedicalQuizError(lower: string): boolean {
  return (
    lower.includes("not a usmle topic") ||
    lower.includes("medical exam-related") ||
    lower.includes("only usmle or medical") ||
    lower.includes("i can only") ||
    lower.includes("use a usmle topic") ||
    lower.includes("non-medical questions") ||
    lower.includes("non-medical content") ||
    lower.includes("general chemistry") ||
    lower.includes("not general chemistry")
  );
}

function stripDiagnosticBlocks(message: string): string {
  const markers = [
    "💡 Troubleshooting:",
    "Troubleshooting:",
    "💡 Debugging Steps:",
    "Debugging Steps:",
    "Error Creating Quiz",
    "❌ Error Creating Quiz",
    "This usually means:",
    "Solutions:",
    "Free Tier Limits:",
  ];

  let result = message;
  for (const marker of markers) {
    const idx = result.indexOf(marker);
    if (idx !== -1) {
      result = result.substring(0, idx);
    }
  }
  return result.replace(/^❌\s*/m, "").trim();
}
