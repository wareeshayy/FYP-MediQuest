"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { ensureUserProfile } from "@/lib/ensureUserProfile";
import { Loader2, Upload, Link2, Send, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { AIChatbot } from "@/components/chat/AIChatbot";

export default function CreateQuizPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [numQuestions, setNumQuestions] = useState(5); // Reduced default to avoid rate limits
  const [sourceType, setSourceType] = useState<"text" | "pdf" | "url">("text");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // AI Prompt states
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in");
      }

      // Ensure user profile exists in public.users table
      // This handles cases where the trigger didn't run or user was created manually
      try {
        await ensureUserProfile(
          user.id,
          user.email,
          user.user_metadata?.name || user.user_metadata?.full_name
        );
      } catch (profileError: any) {
        console.error("Error ensuring user profile:", profileError);
        throw new Error("Failed to verify user profile. Please try logging out and back in.");
      }

      // Create topic with proper field mapping
      const topicPayload: any = {
        user_id: user.id,
        name: topic,
        source_type: sourceType,
      };

      // Only add description if it exists
      if (description && description.trim()) {
        topicPayload.description = description.trim();
      }

      // Set source_content based on source type
      if (sourceType === "text" && description) {
        topicPayload.source_content = description.trim();
      } else if (sourceType === "url" && url) {
        topicPayload.source_content = url.trim();
      } else if (sourceType === "pdf" && file) {
        // Will be updated with file_url after upload
        topicPayload.source_content = null;
      } else {
        topicPayload.source_content = null;
      }

      // Create topic
      const { data: topicData, error: topicError } = await supabase
        .from("topics")
        .insert(topicPayload)
        .select()
        .single();

      if (topicError) throw topicError;

      // Upload file if provided
      let fileUrl = null;
      if (file && sourceType === "pdf") {
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("user-uploads")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          // Continue without file if upload fails
        } else {
          const { data: urlData } = supabase.storage
            .from("user-uploads")
            .getPublicUrl(fileName);
          fileUrl = urlData.publicUrl;

          // Update topic with file URL
          await supabase
            .from("topics")
            .update({ file_url: fileUrl })
            .eq("id", topicData.id);
        }
      }

      // Call API route to generate questions
      // Pass the actual content (text, URL, or file) for AI processing
      const contentToProcess = 
        sourceType === "url" ? url :
        sourceType === "text" ? description :
        sourceType === "pdf" && fileUrl ? fileUrl :
        topic; // Fallback to topic name

      console.log("📝 Creating quiz with:", {
        topic,
        sourceType,
        numQuestions,
        difficulty,
        topicId: topicData.id,
        userId: user.id,
        contentLength: contentToProcess?.length || 0,
      });

      // Longer delay for free tier to avoid rate limits
      // Free tier allows ~15 requests per minute, so we wait longer
      const delay = Math.min(3000 + (numQuestions * 300), 8000); // 3-8 seconds based on question count
      console.log(`⏳ Waiting ${delay/1000}s before API call to respect free tier rate limits...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      console.log("🚀 Calling /api/generate-questions...");
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          content: contentToProcess, // Pass the actual content
          numQuestions,
          difficulty,
          topicId: topicData.id,
          userId: user.id,
          sourceType, // Pass source type so API knows how to process it
        }),
      });

      // Check if response is JSON or HTML (error page)
      const contentType = response.headers.get("content-type");
      let result;
      
      console.log("📥 API Response:", {
        status: response.status,
        statusText: response.statusText,
        contentType: contentType,
        ok: response.ok,
      });
      
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
        console.log("✅ Received JSON response:", {
          success: result.success,
          quizId: result.quizId,
          questionsCount: result.questions?.length || 0,
          error: result.error,
        });
      } else {
        // Response is HTML (likely an error page)
        const text = await response.text();
        console.error("❌ API returned HTML instead of JSON:", text.substring(0, 500));
        throw new Error(
          `API route returned an error page (Status: ${response.status}).\n\n` +
          `This usually means:\n` +
          `1. The API route crashed (check server logs)\n` +
          `2. Missing environment variables (GROQ_API_KEY, SUPABASE_SERVICE_ROLE_KEY)\n` +
          `3. Server error - check terminal for details\n\n` +
          `Response preview: ${text.substring(0, 200)}...`
        );
      }

      if (!response.ok) {
        console.error("❌ API response not OK:", {
          status: response.status,
          statusText: response.statusText,
          error: result.error,
          details: result.details,
        });
        
        // Handle quota/rate limit errors with helpful message
        if (result.error && (result.error.includes("quota") || result.error.includes("rate limit") || result.error.includes("Rate limit") || result.error.includes("Quota") || result.error.includes("429"))) {
          throw new Error(
            result.error + "\n\n" +
            "💡 Free Tier Limits:\n" +
            "• ~15 requests per minute\n" +
            "• ~1500 requests per day\n" +
            "• Very strict limits for testing\n\n" +
            "Solutions:\n" +
            "1. ⏰ Wait 10-15 minutes (rate limit) or 24 hours (quota)\n" +
            "2. 📉 Reduce questions to 3-5 (instead of 10+)\n" +
            "3. 🔄 Check quota: https://aistudio.google.com/app/apikey\n" +
            "4. ⬆️ Consider upgrading for production use"
          );
        }
        
        // Provide detailed error message
        const errorMsg = result.error || `Failed to generate questions: ${response.statusText}`;
        console.error("Error message:", errorMsg);
        throw new Error(errorMsg);
      }
      
      if (!result.success) {
        console.error("❌ API returned success: false", result);
        throw new Error(result.error || "Quiz generation failed - no error message provided");
      }
      
      if (!result.quizId) {
        console.error("❌ No quizId in response", result);
        throw new Error("Quiz was created but no quiz ID was returned. Please try again.");
      }

      // Redirect to quiz page
      if (result.quizId) {
        router.push(`/play/${result.quizId}`);
      } else {
        router.push("/dashboard");
      }

    } catch (err: any) {
      console.error("❌ Error creating quiz:", err);
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name,
        cause: err.cause,
      });
      
      // Provide more detailed error messages
      let errorMessage = "Failed to create quiz";
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.error) {
        errorMessage = err.error;
      } else if (err.toString && err.toString() !== "[object Object]") {
        errorMessage = err.toString();
      }
      
      // Add troubleshooting tips for common errors
      if (!errorMessage.includes("quota") && !errorMessage.includes("rate limit")) {
        errorMessage += "\n\n💡 Troubleshooting:\n";
        errorMessage += "1. Check your browser console for more details\n";
        errorMessage += "2. Check server logs in your terminal\n";
        errorMessage += "3. Verify your GROQ_API_KEY is set in .env.local\n";
        errorMessage += "4. Ensure SUPABASE_SERVICE_ROLE_KEY is configured\n";
        errorMessage += "5. Try refreshing the page and trying again";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAskAI = async () => {
    if (!aiPrompt.trim() || aiLoading) return;

    setAiLoading(true);
    setAiResponse(null);
    setError(null);

    try {
      // Build context from form data
      let contextString = "The user is creating a quiz. ";
      if (topic) {
        contextString += `Topic: ${topic}. `;
      }
      if (description || url) {
        contextString += `Content provided: ${(description || url || "").substring(0, 1000)}... `;
      }
      contextString += "Help them with quiz creation, content improvement, topic suggestions, or generating quiz ideas.";

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: aiPrompt.trim(),
            },
          ],
          context: contextString,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get AI response");
      }

      const data = await response.json();
      setAiResponse(data.response || "I apologize, but I couldn't generate a response.");
      setAiPrompt(""); // Clear input after successful response
    } catch (err: any) {
      console.error("AI prompt error:", err);
      setError(err.message || "Failed to get AI response. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAskAI();
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white border-2 border-gray-200 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-b border-teal-100">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Create New Quiz
                </CardTitle>
                <CardDescription className="text-gray-600 text-base">
                  Generate personalized MCQs from any topic or content
                </CardDescription>
              </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic Name *</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Photosynthesis, Data Structures, History of Rome"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceType">Content Source</Label>
                  <Select
                    value={sourceType}
                    onValueChange={(value: "text" | "pdf" | "url") =>
                      setSourceType(value)
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Enter Text/Notes</SelectItem>
                      <SelectItem value="pdf">Upload PDF</SelectItem>
                      <SelectItem value="url">Enter URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {sourceType === "text" && (
                  <div className="space-y-2">
                    <Label htmlFor="description">Content/Notes</Label>
                    <textarea
                      id="description"
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Paste your notes or content here..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                )}

                {sourceType === "pdf" && (
                  <div className="space-y-2">
                    <Label htmlFor="file">Upload PDF</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        disabled={loading}
                        className="cursor-pointer"
                      />
                      {file && (
                        <span className="text-sm text-muted-foreground">
                          {file.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <Upload className="inline h-3 w-3 mr-1" />
                      PDF will be processed using OCR
                    </p>
                  </div>
                )}

                {sourceType === "url" && (
                  <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="url"
                        type="url"
                        placeholder="https://example.com/article"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={difficulty}
                      onValueChange={(value: "easy" | "medium" | "hard") =>
                        setDifficulty(value)
                      }
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numQuestions">
                      Number of Questions: {numQuestions}
                    </Label>
                    <Input
                      id="numQuestions"
                      type="range"
                      min="3"
                      max="10"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(Number(e.target.value))}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      💡 Tip: Start with 3-5 questions to avoid rate limits. Free tier has limited requests.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 rounded-lg whitespace-pre-wrap">
                    <div className="font-semibold mb-2 flex items-center gap-2">
                      <span>❌</span>
                      <span>Error Creating Quiz</span>
                    </div>
                    <div className="mb-3">{error}</div>
                    <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800 text-xs text-red-500 dark:text-red-400">
                      💡 <strong>Debugging Steps:</strong><br />
                      1. Open browser console (F12) to see detailed logs<br />
                      2. Check your server terminal for API errors<br />
                      3. Verify GROQ_API_KEY is set in .env.local<br />
                      4. Ensure SUPABASE_SERVICE_ROLE_KEY is configured<br />
                      5. Check if you've exceeded API quota limits
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="  " 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Quiz...
                    </>
                  ) : (
                    "Generate Quiz"
                  )}
                </Button>
              </form>

              {/* AI Prompt Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Label htmlFor="aiPrompt" className="text-base font-semibold flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-teal-500" />
                  Ask AI Assistant
                </Label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      id="aiPrompt"
                      placeholder="Ask me anything about quiz creation, topics, content improvement..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={aiLoading || loading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleAskAI}
                      disabled={aiLoading || loading || !aiPrompt.trim()}
                      className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-600 hover:via-cyan-600 hover:to-blue-700 text-white px-6"
                    >
                      {aiLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {aiResponse && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border border-teal-200 rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-teal-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiResponse}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {aiLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
                      <span>AI is thinking...</span>
                    </div>
                  )}

                  {/* <p className="text-xs text-gray-500">
                    💡 Ask questions like: "Suggest topics for a biology quiz", "Improve this content", "Explain this concept"
                  </p> */}
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </div>

        {/* AI Chatbot - Help with quiz creation */}
        <AIChatbot
          sourceContent={description || url || topic || undefined}
          topicName={topic || "Quiz Creation"}
        />
      </MainLayout>
    </ProtectedRoute>
  );
}

