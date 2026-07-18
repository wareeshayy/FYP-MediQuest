import { createClient } from "@supabase/supabase-js";
import { retrieveChunks } from "@/lib/rag/retrieve";
import { AgentTool } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize server-side Supabase client for agent data queries
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * 1. Medical PDF RAG Search Tool
 */
export const searchMedicalRagTool: AgentTool = {
  name: "search_medical_rag",
  description: "Search 17 verified USMLE/PLAB medical study PDFs for clinical guidelines, physiology, pharmacology, and pathophysiology. Best for grounding answers in study material.",
  parameters: JSON.stringify({
    query: { type: "string", description: "Semantic search query, e.g., 'beta blockers side effects' or 'nephrotic syndrome diagnostic criteria'" },
    materialId: { type: "string", description: "Optional specific PDF id to filter search (e.g. 'pharmacology', 'cardiology')" }
  }),
  execute: async (args: { query: string; materialId?: string }) => {
    try {
      const validMaterialIds = [
        "biochemistry", "immunology", "microbiology", "pathology", 
        "pharmacology", "public-health-sciences", "cardiovascular", 
        "endocrine", "gastrointestinal", "hematology-oncology", 
        "musculoskeletal-skin-connective-tissue", "neurology", 
        "psychiatry", "renal", "reproductive", "respiratory"
      ];
      
      let filterId = args.materialId;
      if (filterId) {
        filterId = filterId.toLowerCase().trim();
        if (!validMaterialIds.includes(filterId)) {
          const matched = validMaterialIds.find(id => id.includes(filterId!) || filterId!.includes(id));
          if (matched) {
            console.log(`🔧 search_medical_rag: Remapped invalid materialId "${args.materialId}" to "${matched}"`);
            filterId = matched;
          } else {
            console.log(`🔧 search_medical_rag: Ignoring invalid materialId "${args.materialId}", searching all material`);
            filterId = undefined;
          }
        }
      }

      const chunks = await retrieveChunks({
        query: args.query,
        materialId: filterId,
        topK: 5
      });

      if (!chunks || chunks.length === 0) {
        return "No relevant medical study excerpts found for query: " + args.query;
      }

      return chunks.map((c, i) => 
        `[Source ${i + 1}: ${c.materialTitle || c.materialId} (Relevance: ${(c.score * 100).toFixed(1)}%)]\n${c.content}`
      ).join("\n\n");
    } catch (error: any) {
      return `Error searching medical RAG: ${error.message}`;
    }
  }
};

/**
 * 2. Retrieve User Performance Profile (Session Memory)
 */
export const retrieveUserProfileTool: AgentTool = {
  name: "retrieve_user_profile",
  description: "Retrieve the current student's performance statistics, weak subjects, average score, and quiz histories. Use this to personalize the tutoring style.",
  parameters: JSON.stringify({}),
  execute: async (_args: any, userId?: string) => {
    if (!supabaseAdmin) {
      return "Database error: Supabase client is not configured on the server.";
    }
    if (!userId) {
      return "No user logged in. Unable to retrieve user performance profile.";
    }

    try {
      // Fetch user's recent results
      const { data: results, error: resultsError } = await supabaseAdmin
        .from("results")
        .select(`
          score,
          accuracy,
          created_at,
          quiz:quizzes(id, title, topic_id)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (resultsError) throw resultsError;

      if (!results || results.length === 0) {
        return "This student has not taken any quizzes yet. Tutoring style recommendation: welcoming, introductory, and structured.";
      }

      // Collect topic IDs to retrieve names
      const topicIds = Array.from(new Set(
        results.map((r: any) => r.quiz?.topic_id).filter(Boolean)
      ));

      let topicsMap = new Map<string, string>();
      if (topicIds.length > 0) {
        const { data: topicsData } = await supabaseAdmin
          .from("topics")
          .select("id, name")
          .in("id", topicIds);
        
        topicsData?.forEach(t => topicsMap.set(t.id, t.name));
      }

      // Calculate stats
      const totalQuizzes = results.length;
      const averageAccuracy = results.reduce((acc: number, r: any) => acc + (r.accuracy || 0), 0) / totalQuizzes;
      
      const topicStatsMap = new Map<string, { total: number; sumAccuracy: number }>();
      results.forEach((r: any) => {
        const topicId = r.quiz?.topic_id;
        if (topicId) {
          const topicName = topicsMap.get(topicId) || "Other";
          const current = topicStatsMap.get(topicName) || { total: 0, sumAccuracy: 0 };
          topicStatsMap.set(topicName, {
            total: current.total + 1,
            sumAccuracy: current.sumAccuracy + (r.accuracy || 0)
          });
        }
      });

      const topicAccuracies = Array.from(topicStatsMap.entries()).map(([name, stats]) => ({
        name,
        accuracy: stats.sumAccuracy / stats.total
      }));

      // Find weak topics (accuracy < 70%) and strong topics (accuracy >= 70%)
      const weakTopics = topicAccuracies.filter(t => t.accuracy < 70).map(t => `${t.name} (${t.accuracy.toFixed(0)}% accuracy)`);
      const strongTopics = topicAccuracies.filter(t => t.accuracy >= 70).map(t => `${t.name} (${t.accuracy.toFixed(0)}% accuracy)`);

      return JSON.stringify({
        summary: `The student has taken ${totalQuizzes} quizzes with an overall average accuracy of ${averageAccuracy.toFixed(1)}%.`,
        weak_topics: weakTopics.length > 0 ? weakTopics : ["None identified yet (good performance!)"],
        strong_topics: strongTopics.length > 0 ? strongTopics : ["None yet (needs more practice)"],
        recent_quizzes: results.slice(0, 3).map((r: any) => ({
          title: r.quiz?.title || "USMLE Prep Quiz",
          accuracy: `${(r.accuracy || 0).toFixed(0)}%`,
          date: new Date(r.created_at).toLocaleDateString()
        }))
      }, null, 2);

    } catch (error: any) {
      return `Error retrieving user profile: ${error.message}`;
    }
  }
};

/**
 * 3. Clinical Pharmacology Drug Reference Database
 */
export const searchPharmacologyTool: AgentTool = {
  name: "search_pharmacology",
  description: "Retrieve clinical information about common USMLE drugs, including drug class, mechanism of action, clinical indications, adverse effects, and contraindications.",
  parameters: JSON.stringify({
    drugName: { type: "string", description: "Name of the drug, e.g. 'Lisinopril', 'Metformin', 'Metoprolol', 'Albuterol'" }
  }),
  execute: async (args: { drugName: string }) => {
    const query = args.drugName.toLowerCase().trim();

    const pharmacologyDb: Record<string, {
      class: string;
      mechanism: string;
      indications: string[];
      sideEffects: string[];
      contraindications: string[];
    }> = {
      lisinopril: {
        class: "ACE Inhibitor (Angiotensin-Converting Enzyme Inhibitor)",
        mechanism: "Inhibits ACE, blocking conversion of Angiotensin I to Angiotensin II (a potent vasoconstrictor). Decreases aldosterone secretion, reducing sodium and water retention. Increases bradykinin levels (causing vasodilation but also dry cough).",
        indications: ["Hypertension", "Heart Failure (reduced ejection fraction)", "Post-Myocardial Infarction", "Diabetic Nephropathy (delays progression)"],
        sideEffects: ["Dry cough (due to bradykinin accumulation)", "Hyperkalemia", "Angioedema (life-threatening airway compromise)", "Acute Kidney Injury (especially in bilateral renal artery stenosis)", "Hypotension"],
        contraindications: ["Pregnancy (teratogenic: renal dysgenesis)", "History of Angioedema", "Concomitant use of Aliskiren in diabetes"]
      },
      metformin: {
        class: "Biguanide (Oral Hypoglycemic)",
        mechanism: "Inhibits mitochondrial glycerophosphate dehydrogenase and complex I, leading to activation of AMP-activated protein kinase (AMPK). Decreases hepatic gluconeogenesis, increases peripheral glucose uptake/insulin sensitivity, and slows intestinal glucose absorption.",
        indications: ["Type 2 Diabetes Mellitus (first-line therapy)", "Polycystic Ovary Syndrome (PCOS) - off-label for ovulation induction"],
        sideEffects: ["Gastrointestinal upset (diarrhea, abdominal pain, nausea)", "Lactic acidosis (rare but severe, especially in renal dysfunction)", "Vitamin B12 deficiency (long-term use)"],
        contraindications: ["Renal impairment (eGFR < 30 mL/min/1.73m²)", "Severe liver disease", "Dehydration or acute heart failure (increases lactic acidosis risk)"]
      },
      metoprolol: {
        class: "Beta-1 Selective Adrenergic Antagonist (Beta Blocker)",
        mechanism: "Selectively blocks Beta-1 receptors in cardiocytes. Decreases heart rate (negative chronotropy), myocardial contractility (negative inotropy), cardiac output, and renin secretion.",
        indications: ["Hypertension", "Angina Pectoris", "Heart Failure (specifically Metoprolol Succinate)", "Post-Myocardial Infarction (reduces mortality)", "Rate control in Atrial Fibrillation/Flutter"],
        sideEffects: ["Bradycardia", "Heart block", "Fatigue / Exercise intolerance", "Erectile dysfunction", "Depression / Sleep disturbances"],
        contraindications: ["Severe bradycardia / Sick sinus syndrome", "Cardiogenic shock", "decompensated heart failure", "Second or third-degree AV block"]
      },
      albuterol: {
        class: "Short-Acting Beta-2 Adrenergic Agonist (SABA / Bronchodilator)",
        mechanism: "Stimulates Beta-2 receptors on bronchial smooth muscle, activating adenyl cyclase, increasing cyclic AMP (cAMP), leading to smooth muscle relaxation and bronchodilation.",
        indications: ["Acute bronchospasm (Asthma exacerbation)", "Exercise-induced bronchospasm prevention", "COPD symptom relief", "Hyperkalemia (shifts potassium into cells - high dose, temporary measure)"],
        sideEffects: ["Tremor", "Tachycardia / Palpitations", "Hypokalemia (shifts K+ intracellularly)", "Anxiety / Restlessness"],
        contraindications: ["Hypersensitivity to albuterol or milk proteins (some inhaler formulations)"]
      },
      atorvastatin: {
        class: "HMG-CoA Reductase Inhibitor (Statin)",
        mechanism: "Competitively inhibits HMG-CoA reductase, the rate-limiting enzyme in cholesterol synthesis (converts HMG-CoA to mevalonate). Upregulates LDL receptors on hepatocyte membranes, increasing clearance of LDL from blood.",
        indications: ["Hypercholesterolemia (reduces LDL)", "Primary and secondary prevention of Cardiovascular Disease (ACS, Stroke, PAD)"],
        sideEffects: ["Myalgia (muscle pain without CK elevation)", "Myositis / Rhabdomyolysis (severe muscle breakdown, elevated CK)", "Hepatotoxicity (elevated transaminases)", "New-onset Type 2 Diabetes"],
        contraindications: ["Active liver disease", "Pregnancy (teratogenic)", "Breastfeeding"]
      },
      omeprazole: {
        class: "Proton Pump Inhibitor (PPI)",
        mechanism: "Irreversibly inhibits the H+/K+ ATPase pump (proton pump) in gastric parietal cells, blocking the final pathway of gastric acid secretion.",
        indications: ["Gastroesophageal Reflux Disease (GERD)", "Peptic Ulcer Disease (PUD)", "Zollinger-Ellison Syndrome", "H. pylori eradication (part of triple/quadruple therapy)", "NSAID-induced ulcer prophylaxis"],
        sideEffects: ["Increased risk of C. difficile infection", "Increased risk of pneumonia", "Osteoporosis / Hip fractures (long-term use due to decreased calcium absorption)", "Hypomagnesemia", "Interstitial nephritis"],
        contraindications: ["Hypersensitivity to PPIs", "Concomitant use of Rilpivirine"]
      }
    };

    const matchedDrug = Object.keys(pharmacologyDb).find(k => query.includes(k) || k.includes(query));
    if (matchedDrug) {
      const data = pharmacologyDb[matchedDrug];
      return JSON.stringify({
        drug: matchedDrug.toUpperCase(),
        class: data.class,
        mechanism: data.mechanism,
        indications: data.indications,
        side_effects: data.sideEffects,
        contraindications: data.contraindications
      }, null, 2);
    }

    return `Drug "${args.drugName}" was not found in the pharmacology database. Recommendation: query 'search_medical_rag' for details on this drug.`;
  }
};

/**
 * 4. Clinical Formula Calculator Tool
 */
export const calculateMedicalFormulaTool: AgentTool = {
  name: "calculate_medical_formula",
  description: "Calculate standard clinical equations for USMLE examinations, such as Anion Gap, BMI, Cockcroft-Gault GFR, or Friedewald LDL.",
  parameters: JSON.stringify({
    formulaName: { type: "string", description: "Name of the formula: 'Anion Gap', 'BMI', 'GFR', or 'LDL'" },
    params: {
      type: "object",
      description: "Formula parameters. For Anion Gap: { Na, Cl, HCO3 }. For BMI: { weight_kg, height_cm }. For GFR: { age, weight_kg, creatinine_mg_dl, isFemale }. For LDL: { total_chol, hdl, triglycerides }"
    }
  }),
  execute: async (args: { formulaName: string; params: any }) => {
    if (!args || typeof args !== "object" || !args.formulaName) {
      return "Error: Invalid tool input. Expected parameters object with 'formulaName' (string) and 'params' (object). Example: { formulaName: 'Anion Gap', params: { Na: 140, Cl: 104, HCO3: 24 } }";
    }
    const formula = args.formulaName.toLowerCase().replace(/[^a-z]/g, "");
    const p = args.params;

    if (!p) {
      return "Error: Missing 'params' object for formula calculation.";
    }

    try {
      if (formula === "aniongap") {
        const { Na, Cl, HCO3 } = p;
        if (Na === undefined || Cl === undefined || HCO3 === undefined) {
          return "Error: Anion Gap requires Na, Cl, and HCO3 values. Example parameters: { Na: 140, Cl: 104, HCO3: 24 }";
        }
        const gap = Number(Na) - (Number(Cl) + Number(HCO3));
        let clinicalNote = "";
        if (gap > 12) {
          clinicalNote = "Elevated Anion Gap (>12 mEq/L) indicates High Anion Gap Metabolic Acidosis (HAGMA). Common causes include MUDPILES: Methanol, Uremia, DKA, Propylene glycol, Iron/INH, Lactic acidosis, Ethylene glycol, Salicylates.";
        } else if (gap < 8) {
          clinicalNote = "Low Anion Gap (<8 mEq/L) is uncommon. Causes include hypoalbuminemia, multiple myeloma (IgG paraproteinemia), lithium toxicity.";
        } else {
          clinicalNote = "Normal Anion Gap (8-12 mEq/L). Causes of Normal Anion Gap Metabolic Acidosis (NAGMA) include diarrhea, Renal Tubular Acidosis (RTA), acetazolamide, spironolactone.";
        }
        return JSON.stringify({
          formula: "Anion Gap (Na - (Cl + HCO3))",
          inputs: { Na, Cl, HCO3 },
          result: `${gap.toFixed(1)} mEq/L`,
          interpretation: clinicalNote
        }, null, 2);
      }

      if (formula === "bmi") {
        const { weight_kg, height_cm } = p;
        if (weight_kg === undefined || height_cm === undefined) {
          return "Error: BMI requires weight_kg and height_cm values. Example parameters: { weight_kg: 70, height_cm: 175 }";
        }
        const height_m = Number(height_cm) / 100;
        const bmi = Number(weight_kg) / (height_m * height_m);
        let category = "";
        if (bmi < 18.5) category = "Underweight (<18.5)";
        else if (bmi < 25) category = "Normal weight (18.5 - 24.9)";
        else if (bmi < 30) category = "Overweight (25.0 - 29.9)";
        else category = "Obese (>=30.0)";

        return JSON.stringify({
          formula: "Body Mass Index (Weight_kg / Height_m^2)",
          inputs: { weight_kg, height_cm },
          result: `${bmi.toFixed(2)} kg/m²`,
          category
        }, null, 2);
      }

      if (formula === "gfr" || formula === "cockcroftgault") {
        const { age, weight_kg, creatinine_mg_dl, isFemale } = p;
        if (age === undefined || weight_kg === undefined || creatinine_mg_dl === undefined) {
          return "Error: GFR (Cockcroft-Gault) requires age, weight_kg, creatinine_mg_dl, and isFemale (boolean) values. Example parameters: { age: 65, weight_kg: 72, creatinine_mg_dl: 1.2, isFemale: false }";
        }
        let gfr = ((140 - Number(age)) * Number(weight_kg)) / (72 * Number(creatinine_mg_dl));
        if (isFemale) {
          gfr *= 0.85;
        }
        let staging = "";
        if (gfr >= 90) staging = "Stage 1: Normal or high GFR (>=90)";
        else if (gfr >= 60) staging = "Stage 2: Mildly decreased GFR (60-89)";
        else if (gfr >= 45) staging = "Stage 3a: Mildly to moderately decreased GFR (45-59)";
        else if (gfr >= 30) staging = "Stage 3b: Moderately to severely decreased GFR (30-44)";
        else if (gfr >= 15) staging = "Stage 4: Severely decreased GFR (15-29)";
        else staging = "Stage 5: Kidney failure (ESRD) (<15 or dialysis)";

        return JSON.stringify({
          formula: "Cockcroft-Gault GFR Estimate",
          inputs: { age, weight_kg, creatinine_mg_dl, isFemale: !!isFemale },
          result: `${gfr.toFixed(1)} mL/min`,
          interpretation: staging
        }, null, 2);
      }

      if (formula === "ldl" || formula === "friedewald") {
        const { total_chol, hdl, triglycerides } = p;
        if (total_chol === undefined || hdl === undefined || triglycerides === undefined) {
          return "Error: Friedewald LDL requires total_chol, hdl, and triglycerides values. Example parameters: { total_chol: 220, hdl: 50, triglycerides: 150 }";
        }
        if (triglycerides > 400) {
          return "Error: Friedewald equation is inaccurate when triglycerides are >400 mg/dL. Direct LDL measurement is required.";
        }
        const ldl = Number(total_chol) - Number(hdl) - (Number(triglycerides) / 5);
        return JSON.stringify({
          formula: "Friedewald LDL Equation (Total_Chol - HDL - (TG / 5))",
          inputs: { total_chol, hdl, triglycerides },
          result: `${ldl.toFixed(1)} mg/dL`,
          interpretation: ldl > 190 ? "Very high (>=190 mg/dL) - initiation of high-intensity statin therapy recommended" : ldl > 130 ? "Borderline/High (130-189 mg/dL)" : "Optimal (<100 mg/dL)"
        }, null, 2);
      }

      return `Error: Unknown formula: "${args.formulaName}". Available formulas: 'Anion Gap', 'BMI', 'GFR', 'LDL'.`;
    } catch (e: any) {
      return `Calculation error: ${e.message}`;
    }
  }
};

export const agentTools: AgentTool[] = [
  searchMedicalRagTool,
  retrieveUserProfileTool,
  searchPharmacologyTool,
  calculateMedicalFormulaTool
];

export function getToolByName(name: string): AgentTool | undefined {
  return agentTools.find(t => t.name === name);
}
