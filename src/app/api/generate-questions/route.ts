import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
import { NON_MEDICAL_QUIZ_ERROR } from "@/lib/promptBuilder";
import { formatQuizError } from "@/lib/formatQuizError";
import {
  buildMedicalMCQMessages,
  guardMedicalTopic,
  enforceMedicalMCQs,
  getMedicalAIProvider,
  MEDICAL_LLM_TEMPERATURE,
  MEDICAL_MCQ_MAX_TOKENS,
  type GeneratedMCQ,
  type MedicalChatMessage,
} from "@/lib/medicalAI";
import { callHuggingFaceMedicalLLM, isHuggingFaceConfigured } from "@/lib/huggingface";
import { enrichQuizContentWithRAG } from "@/lib/rag/enrich";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const groqApiKey = process.env.GROQ_API_KEY;
const aiProvider = getMedicalAIProvider();
const hfConfigured = isHuggingFaceConfigured();

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

if (!groqApiKey && !hfConfigured) {
  console.error("Missing AI keys: set GROQ_API_KEY and/or HUGGINGFACE_API_KEY");
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  console.log("📥 Received request to /api/generate-questions");
  
  // Check environment variables first
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase configuration");
    return NextResponse.json(
      { error: "Supabase configuration is missing. Please check your environment variables." },
      { status: 500 }
    );
  }

  if (!groqApiKey && !hfConfigured) {
    console.error("❌ Missing AI API keys");
    return NextResponse.json(
      { error: "AI not configured. Set HUGGINGFACE_API_KEY or GROQ_API_KEY in .env.local." },
      { status: 500 }
    );
  }

  if ((aiProvider === "medgemma" || aiProvider === "biogpt") && !hfConfigured && !groq) {
    return NextResponse.json(
      { error: "HUGGINGFACE_API_KEY is required when MEDICAL_AI_PROVIDER=medgemma." },
      { status: 500 }
    );
  }

  if (aiProvider === "groq" && !groq) {
    return NextResponse.json(
      { error: "Groq API key is missing. Please check your environment variables." },
      { status: 500 }
    );
  }

  if (!supabase) {
    console.error("❌ Failed to initialize services");
    return NextResponse.json(
      { error: "Failed to initialize services. Please check your configuration." },
      { status: 500 }
    );
  }

  try {
    console.log("📝 Parsing request body...");
    const body = await request.json();
    console.log("✅ Request body parsed:", {
      topic: body.topic,
      sourceType: body.sourceType,
      numQuestions: body.numQuestions,
      difficulty: body.difficulty,
      hasTopicId: !!body.topicId,
      hasUserId: !!body.userId,
      contentLength: body.content?.length || 0,
    });
    const { topic, content, sourceType, numQuestions = 5, difficulty = "medium", topicId, userId, materialId } = body;

    if (!topic || !topicId || !userId) {
      console.error("❌ Missing required fields:", {
        hasTopic: !!topic,
        hasTopicId: !!topicId,
        hasUserId: !!userId,
      });
      return NextResponse.json(
        { error: `Missing required fields: ${!topic ? 'topic' : ''} ${!topicId ? 'topicId' : ''} ${!userId ? 'userId' : ''}`.trim() },
        { status: 400 }
      );
    }
    
    console.log("✅ All required fields present, proceeding with question generation...");

    const enhancedContent = await enrichQuizContentWithRAG({
      topic,
      materialId,
      sourceType,
      existingContent: typeof content === "string" ? content : undefined,
    });

    const topicError = guardMedicalTopic(topic, {
      content: enhancedContent ?? (typeof content === "string" ? content : ""),
      sourceType,
      materialId,
    });

    if (topicError) {
      console.warn("🚫 Blocked non-medical quiz request:", { topic, sourceType, materialId });
      return NextResponse.json({ error: topicError }, { status: 400 });
    }

    const mcqInput = {
      topic,
      difficulty,
      numberOfQuestions: numQuestions,
      content: enhancedContent,
      sourceType,
    };

    const groqModels = [
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "llama-3.3-70b-versatile",
    ];

    async function callGroqWithMessages(messages: MedicalChatMessage[]): Promise<string> {
      if (!groq) {
        throw new Error("Groq is not configured");
      }
      let lastErr: unknown = null;
      for (const model of groqModels) {
        try {
          console.log(`🚀 Calling Groq API with model: ${model}`);
          const completion = await groq.chat.completions.create({
            messages,
            model,
            temperature: MEDICAL_LLM_TEMPERATURE,
            max_tokens: MEDICAL_MCQ_MAX_TOKENS,
          });
          return completion.choices[0]?.message?.content || "[]";
        } catch (apiError: unknown) {
          lastErr = apiError;
          const msg = apiError instanceof Error ? apiError.message : "Unknown error";
          console.warn(`❌ Model ${model} failed:`, msg);
        }
      }
      throw new Error(
        `Groq API error: ${lastErr instanceof Error ? lastErr.message : "Unknown error"}`
      );
    }

    async function callMedicalLLM(strictRetry = false): Promise<string> {
      const messages = buildMedicalMCQMessages(mcqInput, strictRetry);

      if (aiProvider === "medgemma" || aiProvider === "biogpt") {
        try {
          console.log(`🚀 Calling Hugging Face (${aiProvider})...`);
          return await callHuggingFaceMedicalLLM(messages, {
            model: aiProvider === "biogpt" ? "biogpt" : "medgemma",
          });
        } catch (hfError: unknown) {
          const hfMsg = hfError instanceof Error ? hfError.message : "Unknown HF error";
          console.warn(`❌ Hugging Face failed: ${hfMsg}`);
          if (groq) {
            console.log("↩️ Falling back to Groq...");
            return callGroqWithMessages(messages);
          }
          throw hfError;
        }
      }

      return callGroqWithMessages(messages);
    }

    function parseQuestions(responseText: string): GeneratedMCQ[] {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText);
      return Array.isArray(parsed) ? parsed : [];
    }

    let responseText = await callMedicalLLM(false);
    let questions: GeneratedMCQ[] = [];

    try {
      questions = parseQuestions(responseText);
    } catch (parseError) {
      console.error("Error parsing Groq response:", parseError);
      return NextResponse.json(
        { error: "Failed to parse AI response." },
        { status: 500 }
      );
    }

    questions = enforceMedicalMCQs(questions);

    if (questions.length < numQuestions) {
      console.warn(`⚠️ Only ${questions.length} medical MCQs passed filter, retrying strictly...`);
      try {
        responseText = await callMedicalLLM(true);
        questions = enforceMedicalMCQs(parseQuestions(responseText));
      } catch (retryError) {
        console.error("Retry parse failed:", retryError);
      }
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: NON_MEDICAL_QUIZ_ERROR },
        { status: 400 }
      );
    }

    questions = questions.slice(0, numQuestions);

    console.log(`✅ ${questions.length} USMLE-style medical MCQs passed validation`);

    // Store questions in database
    console.log("💾 Storing questions in database...");
    const insertedQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      console.log(`📝 Inserting question ${i + 1}/${questions.length}...`);
      
      // Validate question structure
      if (!q.question_text || !q.options || !Array.isArray(q.options) || q.correct_option === undefined) {
        console.error(`❌ Invalid question structure at index ${i}:`, q);
        continue;
      }

      const correctOption = q.correct_option;
      
      // Normalize correct_option to ensure it matches one of the options
      let normalizedCorrectOption = correctOption;
      
      // If correct_option is a number (index), convert to option text
      if (!isNaN(Number(correctOption)) && Number(correctOption) >= 0 && Number(correctOption) < q.options.length) {
        normalizedCorrectOption = q.options[Number(correctOption)];
        console.log(`📝 Normalized correct_option from index ${correctOption} to: "${normalizedCorrectOption}"`);
      }
      // If correct_option is a letter (A, B, C, D), convert to option text
      else if (correctOption.length === 1 && /^[A-D]$/i.test(correctOption)) {
        const letterIndex = correctOption.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
        if (letterIndex >= 0 && letterIndex < q.options.length) {
          normalizedCorrectOption = q.options[letterIndex];
          console.log(`📝 Normalized correct_option from letter "${correctOption}" to: "${normalizedCorrectOption}"`);
        }
      }
      // If correct_option is not in options array, try to find it (case-insensitive)
      else if (!q.options.includes(correctOption)) {
        const foundOption = q.options.find((opt: string) => 
          opt.toLowerCase().trim() === correctOption.toLowerCase().trim()
        );
        if (foundOption) {
          normalizedCorrectOption = foundOption;
          console.log(`📝 Normalized correct_option from "${correctOption}" to: "${normalizedCorrectOption}"`);
        } else {
          console.warn(`⚠️ correct_option "${correctOption}" not found in options array:`, q.options);
          // Use the first option as fallback (not ideal, but better than failing)
          normalizedCorrectOption = q.options[0];
          console.warn(`⚠️ Using first option as fallback: "${normalizedCorrectOption}"`);
        }
      }
      
      console.log(`✅ Question ${i + 1} - Normalized correct_option:`, {
        original: q.correct_option,
        normalized: normalizedCorrectOption,
        options: q.options,
        match: q.options.includes(normalizedCorrectOption),
      });
      
      const { data: question, error: questionError } = await supabase
        .from("questions")
        .insert({
          topic_id: topicId,
          question_text: q.question_text,
          options: q.options,
          correct_option: normalizedCorrectOption, // Use normalized value
          explanation: q.explanation || "",
          difficulty,
        })
        .select()
        .single();

      if (questionError) {
        console.error(`❌ Error inserting question ${i + 1}:`, questionError);
        console.error("Question data:", q);
        continue;
      }

      insertedQuestions.push(question);
      console.log(`✅ Question ${i + 1} inserted successfully`);
    }
    
    if (insertedQuestions.length === 0) {
      console.error("❌ No questions were successfully inserted into database");
      return NextResponse.json(
        { error: "Failed to store questions in database. Please check database connection and schema." },
        { status: 500 }
      );
    }
    
    console.log(`✅ Successfully stored ${insertedQuestions.length} questions in database`);

    // Create or update quiz
    console.log("📝 Creating or finding quiz for topic:", topicId);
    const { data: existingQuiz, error: existingQuizError } = await supabase
      .from("quizzes")
      .select("id")
      .eq("topic_id", topicId)
      .eq("user_id", userId)
      .single();

    if (existingQuizError && existingQuizError.code !== "PGRST116") {
      // PGRST116 means no rows found, which is fine
      console.error("❌ Error checking for existing quiz:", existingQuizError);
    }

    let quizId;
    if (existingQuiz) {
      quizId = existingQuiz.id;
      console.log(`✅ Found existing quiz: ${quizId}`);
    } else {
      console.log("📝 Creating new quiz...");
      
      // Build quiz payload - check if title column exists
      const quizPayload: any = {
        user_id: userId,
        topic_id: topicId,
        difficulty,
        total_questions: insertedQuestions.length,
        time_limit: insertedQuestions.length * 60, // 60 seconds per question
      };
      
      // Try to add title, but don't fail if column doesn't exist
      // We'll handle this gracefully
      try {
        quizPayload.title = `${topic} — USMLE/PLAB Quiz`;
      } catch (e) {
        console.warn("Title column may not exist, continuing without it");
      }
      
      const { data: newQuiz, error: quizError } = await supabase
        .from("quizzes")
        .insert(quizPayload)
        .select()
        .single();

      if (quizError) {
        console.error("❌ Error creating quiz:", quizError);
        
        // If error is about missing title column, retry without it
        if (quizError.message?.includes("title") || quizError.code === "PGRST204") {
          console.log("⚠️ Title column may not exist, retrying without title...");
          delete quizPayload.title;
          
          const { data: retryQuiz, error: retryError } = await supabase
            .from("quizzes")
            .insert(quizPayload)
            .select()
            .single();
            
          if (retryError) {
            console.error("❌ Error creating quiz (retry):", retryError);
            return NextResponse.json(
              { error: `Failed to create quiz: ${retryError.message}. Please run ADD_QUIZ_TITLE_COLUMN.sql in Supabase SQL Editor.` },
              { status: 500 }
            );
          }
          
          if (!retryQuiz || !retryQuiz.id) {
            return NextResponse.json(
              { error: "Quiz was created but no ID was returned" },
              { status: 500 }
            );
          }
          
          quizId = retryQuiz.id;
          console.log(`✅ Successfully created quiz (without title): ${quizId}`);
        } else {
          return NextResponse.json(
            { error: `Failed to create quiz: ${quizError.message}` },
            { status: 500 }
          );
        }
      } else {
        if (!newQuiz || !newQuiz.id) {
          console.error("❌ Quiz created but no ID returned");
          return NextResponse.json(
            { error: "Quiz was created but no ID was returned" },
            { status: 500 }
          );
        }

        quizId = newQuiz.id;
        console.log(`✅ Successfully created quiz: ${quizId}`);
      }
    }
    
    // Ensure quizId is set
    if (!quizId) {
      return NextResponse.json(
        { error: "Failed to get quiz ID" },
        { status: 500 }
      );
    }

    // Link questions to quiz
    console.log(`🔗 Linking ${insertedQuestions.length} questions to quiz ${quizId}...`);
    const quizQuestionLinks = [];
    for (let i = 0; i < insertedQuestions.length; i++) {
      const { data: linkData, error: linkError } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: quizId,
          question_id: insertedQuestions[i].id,
          question_order: i + 1,
        })
        .select()
        .single();

      if (linkError) {
        console.error(`❌ Error linking question ${i + 1} to quiz:`, linkError);
        console.error("Question ID:", insertedQuestions[i].id);
        console.error("Quiz ID:", quizId);
        // Continue with other questions even if one fails
      } else {
        quizQuestionLinks.push(linkData);
        console.log(`✅ Linked question ${i + 1} to quiz`);
      }
    }

    if (quizQuestionLinks.length === 0) {
      console.error("❌ No questions were successfully linked to quiz");
      return NextResponse.json(
        { error: "Failed to link questions to quiz. Please check database permissions and RLS policies." },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully linked ${quizQuestionLinks.length} questions to quiz`);

    return NextResponse.json({
      success: true,
      quizId,
      questions: insertedQuestions,
      message: `Successfully generated ${insertedQuestions.length} questions`,
    });
  } catch (error: unknown) {
    console.error("❌ Error generating questions:", error);

    const rawMessage =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      { error: formatQuizError(rawMessage) },
      { status: 500 }
    );
  }
}

