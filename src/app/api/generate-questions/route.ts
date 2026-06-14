import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const groqApiKey = process.env.GROQ_API_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey || !groqApiKey) {
  console.error("Missing environment variables:", {
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseServiceKey: !!supabaseServiceKey,
    hasGroqKey: !!groqApiKey,
  });
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

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

  if (!groqApiKey) {
    console.error("❌ Missing Groq API key");
    return NextResponse.json(
      { error: "Groq API key is missing. Please check your environment variables." },
      { status: 500 }
    );
  }

  if (!supabase || !groq) {
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
    const { topic, content, sourceType, numQuestions = 5, difficulty = "medium", topicId, userId } = body;

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

    // Build prompt based on source type and content
    let prompt = ``;
    
    if (sourceType === "url" && content) {
      prompt = `Based on the content from this URL: ${content}
Generate ${numQuestions} multiple choice questions on the topic: "${topic}" with difficulty level: ${difficulty}.`;
    } else if (sourceType === "text" && content) {
      prompt = `Based on the following content:
${content}

Generate ${numQuestions} multiple choice questions on the topic: "${topic}" with difficulty level: ${difficulty}.`;
    } else {
      // Default: use just the topic name
      prompt = `Generate ${numQuestions} multiple choice questions on the topic: "${topic}" with difficulty level: ${difficulty}.`;
    }

    prompt += `

Each question should:
1. Be clear and well-structured
2. Have 4 options (A, B, C, D)
3. Have a correct answer
4. Include a brief explanation (2-3 sentences)

Return the response as a JSON array with the following format:
[
  {
    "question_text": "question here",
    "options": ["option A", "option B", "option C", "option D"],
    "correct_option": "option A",
    "explanation": "explanation here"
  }
]

Important: Return ONLY the JSON array, no additional text or markdown formatting.`;

    // Use currently available Groq models - try different models for best performance
    // Updated to use non-decommissioned models
    const groqModels = [
      "llama-3.1-8b-instant",      // Fast, reliable model (primary - not decommissioned)
      "mixtral-8x7b-32768",        // Alternative high-quality option
      "llama-3.3-70b-versatile",  // If available, newer 70b model
    ];
    
    console.log("🔍 Testing Groq API Key and Models...");
    console.log("API Key present:", !!groqApiKey);
    console.log("API Key length:", groqApiKey?.length || 0);
    
    const fullPrompt = `You are an expert educational content creator. Generate high-quality multiple choice questions.

${prompt}`;

    let responseText: string = "[]";
    let modelName = groqModels[0];
    let success = false;
    let lastError: any = null;
    
    // Try each model until one works
    for (const model of groqModels) {
      try {
        console.log(`🚀 Calling Groq API with model: ${model}`);
        console.log(`📊 Prompt length: ${fullPrompt.length} characters`);
        
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are an expert educational content creator. Always return valid JSON arrays only, no markdown formatting.",
            },
            {
              role: "user",
              content: fullPrompt,
            },
          ],
          model: model,
          temperature: 0.7,
          max_tokens: 4000,
        });
        
        responseText = completion.choices[0]?.message?.content || "[]";
        modelName = model;
        success = true;
        console.log(`✅ Successfully received response from ${modelName}`);
        console.log(`📝 Response length: ${responseText.length} characters`);
        break;
      } catch (apiError: any) {
        lastError = apiError;
        console.warn(`❌ Model ${model} failed:`, apiError.message);
        continue;
      }
    }
    
    if (!success) {
      console.error("❌ All Groq models failed");
      console.error("Last error:", lastError);
      throw new Error(
        `Groq API error: ${lastError?.message || "Unknown error"}\n\n` +
        `Models tried: ${groqModels.join(", ")}\n\n` +
        `Please check:\n` +
        `1. Your GROQ_API_KEY is valid and active\n` +
        `2. Your internet connection\n` +
        `3. Visit https://console.groq.com/ to check your API key status`
      );
    }
    
    // Parse the response text
    
    let questions;

    try {
      // Try to parse JSON from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error("Error parsing Groq response:", parseError);
      console.error("Response text:", responseText);
      return NextResponse.json(
        { error: "Failed to parse AI response. The AI may not have returned valid JSON." },
        { status: 500 }
      );
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      console.error("❌ No questions generated or invalid format:", {
        isArray: Array.isArray(questions),
        length: questions?.length || 0,
        questions: questions,
      });
      return NextResponse.json(
        { error: "No questions generated. The AI may not have returned valid questions." },
        { status: 500 }
      );
    }
    
    console.log(`✅ Successfully parsed ${questions.length} questions from AI response`);

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
      
      // Normalize correct_option to ensure it matches one of the options
      let normalizedCorrectOption = q.correct_option;
      
      // If correct_option is a number (index), convert to option text
      if (!isNaN(Number(q.correct_option)) && Number(q.correct_option) >= 0 && Number(q.correct_option) < q.options.length) {
        normalizedCorrectOption = q.options[Number(q.correct_option)];
        console.log(`📝 Normalized correct_option from index ${q.correct_option} to: "${normalizedCorrectOption}"`);
      }
      // If correct_option is a letter (A, B, C, D), convert to option text
      else if (q.correct_option && q.correct_option.length === 1 && /^[A-D]$/i.test(q.correct_option)) {
        const letterIndex = q.correct_option.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
        if (letterIndex >= 0 && letterIndex < q.options.length) {
          normalizedCorrectOption = q.options[letterIndex];
          console.log(`📝 Normalized correct_option from letter "${q.correct_option}" to: "${normalizedCorrectOption}"`);
        }
      }
      // If correct_option is not in options array, try to find it (case-insensitive)
      else if (!q.options.includes(q.correct_option)) {
        const foundOption = q.options.find((opt: string) => 
          opt.toLowerCase().trim() === q.correct_option.toLowerCase().trim()
        );
        if (foundOption) {
          normalizedCorrectOption = foundOption;
          console.log(`📝 Normalized correct_option from "${q.correct_option}" to: "${normalizedCorrectOption}"`);
        } else {
          console.warn(`⚠️ correct_option "${q.correct_option}" not found in options array:`, q.options);
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
        quizPayload.title = `${topic} Quiz`;
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
  } catch (error: any) {
    console.error("❌ Error generating questions:", error);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code,
      status: error.status,
      statusText: error.statusText,
    });
    
    // Provide more helpful error messages
    let errorMessage = error.message || "Internal server error";
    let errorDetails: any = {
      error: errorMessage,
    };
    
    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorDetails.stack = error.stack;
      errorDetails.fullError = {
        name: error.name,
        message: error.message,
        code: error.code,
        status: error.status,
      };
    }
    
    // Handle specific error types
    if (errorMessage.includes("fetch failed") || errorMessage.includes("ECONNREFUSED")) {
      errorMessage = "Failed to connect to Groq API. Please check:\n" +
        "1. Your GROQ_API_KEY is correct and active\n" +
        "2. Your internet connection\n" +
        "3. Visit https://console.groq.com/ to check your API key status\n" +
        "4. Check server logs for more details";
    } else if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("401") || errorMessage.includes("authentication")) {
      errorMessage = "Invalid Groq API key. Please verify your GROQ_API_KEY in .env.local";
    } else if (errorMessage.includes("quota") || errorMessage.includes("rate limit") || errorMessage.includes("429")) {
      errorMessage = errorMessage; // Keep the detailed quota message from earlier
    } else if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      errorMessage = "Groq model not found. Please check:\n" +
        "1. The model name is correct (llama-3.1-8b-instant, mixtral-8x7b-32768, etc.)\n" +
        "2. Your API key has access to this model\n" +
        "3. Visit https://console.groq.com/ to check available models\n" +
        "4. Note: llama-3.1-70b-versatile has been decommissioned";
    }
    
    errorDetails.error = errorMessage;
    
    return NextResponse.json(
      errorDetails,
      { status: 500 }
    );
  }
}

