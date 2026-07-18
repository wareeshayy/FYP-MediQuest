import { runReactAgent } from "../src/lib/agents/reactAgent";
import { safetyCriticAgent, mcqCriticAgent } from "../src/lib/agents/multiAgent";

async function runTests() {
  console.log("🧪 STARTING AUTONOMOUS AGENT VERIFICATION TESTS 🧪\n");

  // Test 1: ReAct agent tool execution (Pharmacology reference)
  console.log("--------------------------------------------------");
  console.log("Test 1: Pharmacology Reference Tool and ReAct reasoning...");
  try {
    const response = await runReactAgent("What is the mechanism of action and side effects of Metformin?");
    console.log("\nFinal Answer:\n", response.response);
    console.log("\nSteps taken:\n", JSON.stringify(response.steps, null, 2));
    if (response.steps.length > 0 && response.steps.some(s => s.action === "search_pharmacology")) {
      console.log("✅ Test 1 PASSED: Agent successfully routed to search_pharmacology tool.");
    } else {
      console.warn("⚠️ Test 1 WARNING: Agent did not call search_pharmacology tool.");
    }
  } catch (err: any) {
    console.error("❌ Test 1 FAILED:", err.message);
  }

  // Test 2: ReAct agent tool execution (Medical Calculator)
  console.log("\n--------------------------------------------------");
  console.log("Test 2: Anion Gap Formula calculation...");
  try {
    const response = await runReactAgent("Calculate the anion gap if my patient has sodium of 144, chloride of 105, and bicarbonate of 24.");
    console.log("\nFinal Answer:\n", response.response);
    console.log("\nSteps taken:\n", JSON.stringify(response.steps, null, 2));
    if (response.steps.length > 0 && response.steps.some(s => s.action === "calculate_medical_formula")) {
      console.log("✅ Test 2 PASSED: Agent successfully called calculate_medical_formula tool.");
    } else {
      console.warn("⚠️ Test 2 WARNING: Agent did not call calculate_medical_formula tool.");
    }
  } catch (err: any) {
    console.error("❌ Test 2 FAILED:", err.message);
  }

  // Test 3: Safety Critic Agent (Out-of-domain guardrails)
  console.log("\n--------------------------------------------------");
  console.log("Test 3: Safety Critic Agent...");
  try {
    const blockedQuery = "Explain how to sort an array using QuickSort in JavaScript.";
    const rawResponse = "Sure, QuickSort is a sorting algorithm that works by selecting a 'pivot' element...";
    const reviewed = await safetyCriticAgent(rawResponse, blockedQuery);
    console.log("Blocked Query Review Outcome:", reviewed);
    if (reviewed.includes("only assist with USMLE/PLAB")) {
      console.log("✅ Test 3 PASSED: Out-of-scope code explanation was successfully blocked.");
    } else {
      console.warn("❌ Test 3 FAILED: Safety critic did not block out-of-scope response.");
    }
  } catch (err: any) {
    console.error("❌ Test 3 FAILED:", err.message);
  }

  // Test 4: MCQ Critic Agent (Evaluation & formatting checks)
  console.log("\n--------------------------------------------------");
  console.log("Test 4: MCQ Critic evaluation (Incorrect option check)...");
  try {
    const invalidMCQs = [
      {
        question_text: "A 45-year-old male with hypertension is diagnosed. Which drug blocks ACE?",
        options: ["Metoprolol", "Lisinopril", "Metformin", "Albuterol"],
        correct_option: "Carvedilol", // Not in options
        explanation: "Lisinopril is an ACE inhibitor."
      }
    ];
    const validation = await mcqCriticAgent(invalidMCQs, "Hypertension");
    console.log("Validation result:", validation);
    if (!validation.valid && validation.feedback?.includes("correct_option")) {
      console.log("✅ Test 4 PASSED: MCQ Critic successfully rejected the invalid MCQ.");
    } else {
      console.warn("❌ Test 4 FAILED: MCQ Critic failed to flag invalid option.");
    }
  } catch (err: any) {
    console.error("❌ Test 4 FAILED:", err.message);
  }

  console.log("\n--------------------------------------------------");
  console.log("🏁 ALL TESTS COMPLETED 🏁");
}

runTests();
