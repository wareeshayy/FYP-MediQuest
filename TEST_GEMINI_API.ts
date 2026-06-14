// Quick test script to verify your Gemini API key works
// Run this in Node.js or add to a Next.js API route temporarily

import { GoogleGenerativeAI } from "@google/generative-ai";

async function testGeminiAPI() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in environment variables");
    return;
  }
  
  console.log("Testing Gemini API with key:", apiKey.substring(0, 10) + "...");
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try gemini-1.5-flash first
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Say hello in one word");
      const response = await result.response;
      console.log("✅ gemini-1.5-flash works!");
      console.log("Response:", response.text());
      return;
    } catch (flashError: any) {
      console.warn("⚠️ gemini-1.5-flash failed, trying gemini-pro:", flashError.message);
    }
    
    // Fallback to gemini-pro
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Say hello in one word");
    const response = await result.response;
    console.log("✅ gemini-pro works!");
    console.log("Response:", response.text());
    
  } catch (error: any) {
    console.error("❌ Gemini API Error:", error.message);
    
    if (error.message?.includes("API_KEY_INVALID")) {
      console.error("\n💡 Solution: Check your GEMINI_API_KEY in .env.local");
    } else if (error.message?.includes("fetch failed")) {
      console.error("\n💡 Possible solutions:");
      console.error("1. Check your internet connection");
      console.error("2. Enable 'Generative Language API' in Google Cloud Console");
      console.error("3. Verify your API key is active at https://aistudio.google.com/");
    } else if (error.message?.includes("quota") || error.message?.includes("rate")) {
      console.error("\n💡 Solution: API quota exceeded. Check your quota at https://aistudio.google.com/");
    }
  }
}

// Run the test
testGeminiAPI();

