"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Loader2, Clock, ChevronRight, ChevronLeft } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_option: string;
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  total_questions: number;
  time_limit?: number;
}

export default function PlayQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = (params?.quizId as string) || "";

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        // Fetch quiz details
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", quizId)
          .single();

        if (quizError) throw quizError;

        setQuiz(quizData);
        if (quizData.time_limit) {
          setTimeRemaining(quizData.time_limit);
        }

        // Fetch questions for this quiz
        const { data: quizQuestions, error: qqError } = await supabase
          .from("quiz_questions")
          .select("question_id, question_order")
          .eq("quiz_id", quizId)
          .order("question_order", { ascending: true });

        if (qqError) throw qqError;

        if (quizQuestions && quizQuestions.length > 0) {
          const questionIds = quizQuestions.map((qq) => qq.question_id);
          const { data: questionsData, error: questionsError } = await supabase
            .from("questions")
            .select("*")
            .in("id", questionIds);

          if (questionsError) throw questionsError;

          // Sort questions by order
          const sortedQuestions = quizQuestions
            .map((qq) => questionsData?.find((q) => q.id === qq.question_id))
            .filter(Boolean) as Question[];

          setQuestions(sortedQuestions);
          
          // Debug: Log question data to check correct_option format
          console.log("📝 Loaded questions:", sortedQuestions.map(q => ({
            id: q.id,
            question: q.question_text.substring(0, 30) + "...",
            options: q.options,
            correct_option: q.correct_option,
            correct_option_type: typeof q.correct_option,
            correct_in_options: q.options.includes(q.correct_option),
          })));
        }
      } catch (err: any) {
        setError(err.message || "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handleAnswerSelect = (answer: string) => {
    const questionId = questions[currentQuestionIndex]?.id;
    if (questionId) {
      setSelectedAnswers((prev) => ({
        ...prev,
        [questionId]: answer,
      }));
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !quiz) return;

      // Calculate score
      let correctCount = 0;
      questions.forEach((question) => {
        const selectedAnswer = selectedAnswers[question.id];
        const correctOption = question.correct_option;
        
        // Debug logging
        console.log("🔍 Checking answer:", {
          questionId: question.id,
          questionText: question.question_text.substring(0, 50) + "...",
          selectedAnswer,
          correctOption,
          options: question.options,
          match: selectedAnswer === correctOption,
        });
        
        // Try multiple comparison methods to handle different formats
        let isCorrect = false;
        
        // Method 1: Direct string comparison (exact match)
        if (selectedAnswer === correctOption) {
          isCorrect = true;
        }
        // Method 2: Compare trimmed strings (handle whitespace)
        else if (selectedAnswer?.trim() === correctOption?.trim()) {
          isCorrect = true;
        }
        // Method 3: Check if correct_option is an index (0, 1, 2, 3)
        else if (!isNaN(Number(correctOption)) && Number(correctOption) >= 0 && Number(correctOption) < question.options.length) {
          const correctIndex = Number(correctOption);
          if (selectedAnswer === question.options[correctIndex]) {
            isCorrect = true;
          }
        }
        // Method 4: Check if correct_option is a letter (A, B, C, D)
        else if (correctOption && correctOption.length === 1 && /^[A-D]$/i.test(correctOption)) {
          const letterIndex = correctOption.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
          if (letterIndex >= 0 && letterIndex < question.options.length && selectedAnswer === question.options[letterIndex]) {
            isCorrect = true;
          }
        }
        // Method 5: Find correct option in options array and compare
        else if (question.options.includes(correctOption)) {
          // correct_option is the full text, compare directly
          if (selectedAnswer === correctOption) {
            isCorrect = true;
          }
        }
        // Method 6: Case-insensitive comparison
        else if (selectedAnswer?.toLowerCase() === correctOption?.toLowerCase()) {
          isCorrect = true;
        }
        
        if (isCorrect) {
          correctCount++;
          console.log("✅ Correct answer!");
        } else {
          console.log("❌ Incorrect answer");
        }
      });

      const score = correctCount;
      const totalQuestions = questions.length;
      const accuracy = (score / totalQuestions) * 100;

      // Calculate time taken
      const timeTaken = quiz.time_limit
        ? quiz.time_limit - (timeRemaining || 0)
        : null;

      // Save result
      // Build result payload - handle missing total_questions column gracefully
      const resultPayload: any = {
        quiz_id: quizId,
        user_id: user.id,
        score,
        accuracy,
        time_taken: timeTaken,
        answers: selectedAnswers,
      };
      
      // Try to add total_questions, but don't fail if column doesn't exist
      try {
        resultPayload.total_questions = totalQuestions;
      } catch (e) {
        console.warn("total_questions column may not exist, continuing without it");
      }
      
      const { data: resultData, error: resultError } = await supabase
        .from("results")
        .insert(resultPayload)
        .select()
        .single();

      if (resultError) {
        // If error is about missing total_questions column, retry without it
        if (resultError.message?.includes("total_questions") || resultError.code === "PGRST204") {
          console.log("⚠️ total_questions column may not exist, retrying without it...");
          delete resultPayload.total_questions;
          
          const { data: retryResult, error: retryError } = await supabase
            .from("results")
            .insert(resultPayload)
            .select()
            .single();
            
          if (retryError) {
            console.error("❌ Error saving result (retry):", retryError);
            throw new Error(
              `Failed to save result: ${retryError.message}. Please run ADD_RESULTS_TOTAL_QUESTIONS_COLUMN.sql in Supabase SQL Editor.`
            );
          }
          
          if (!retryResult || !retryResult.id) {
            throw new Error("Result was saved but no ID was returned");
          }
          
          // Redirect to results page
          router.push(`/results/${retryResult.id}`);
          return;
        }
        
        throw resultError;
      }

      // Redirect to results page
      router.push(`/results/${resultData.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout showSidebar={false}>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (error || !quiz || questions.length === 0) {
    return (
      <ProtectedRoute>
        <MainLayout showSidebar={false}>
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>
                {error || "Quiz not found or has no questions"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <ProtectedRoute>
      <MainLayout showSidebar={false}>
        <div className="max-w-4xl mx-auto w-full">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold">{quiz.title || "Quiz"}</h1>
              {timeRemaining !== null && (
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="h-5 w-5" />
                  {Math.floor(timeRemaining / 60)}:
                  {String(timeRemaining % 60).padStart(2, "0")}
                </div>
              )}
            </div>
            <div className="w-full bg-secondary rounded-full h-2 mb-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{currentQuestion.question_text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentQuestion.options.map((option, index) => {
                const questionId = currentQuestion.id;
                const isSelected =
                  selectedAnswers[questionId] === option;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                    disabled={submitting}
                  >
                    <span className="font-medium mr-2">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </button>
                );
              })}

              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0 || submitting}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Quiz"
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

