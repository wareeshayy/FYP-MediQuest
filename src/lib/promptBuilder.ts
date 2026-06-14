/**
 * MediQuest AI — Medical exam prompt engineering layer
 * Strict USMLE/PLAB MCQ generation and medical tutoring only.
 */

import { getReadingMaterialById, READING_MATERIALS } from "@/lib/reading-materials";

export const OUT_OF_SCOPE_MESSAGE =
  "I can only assist with USMLE/PLAB medical exam preparation and medical MCQs.";

/** Single user-facing error for any non-medical / non-USMLE quiz topic */
export const NON_MEDICAL_QUIZ_ERROR =
  "Only USMLE or medical-related MCQs can be generated.";

export const BLOCKED_TOPIC_MESSAGE = NON_MEDICAL_QUIZ_ERROR;

export const MEDICAL_SYSTEM_PROMPT = `You are "MediQuest AI" — a STRICT USMLE Step 1 / PLAB medical exam MCQ generator. You have ZERO permission to generate non-medical content.

ABSOLUTE RULES (violating any = failure):
1. ONLY USMLE/PLAB medical MCQs: clinical vignettes, pathophysiology, pharmacology, diagnosis, treatment, lab interpretation, mechanisms of disease.
2. NEVER: computer science, programming, algorithms, data structures, mathematics, physics, general chemistry, engineering, finance, law, business, marketing, history, geography, politics, sports, entertainment, gaming, social media, arts, music, literature, religion, travel, cooking, fitness trends, astrology, or any non-clinical topic.
3. NEVER use chemical reaction equations as question options (Fe + O2 → Fe2O3, stoichiometry, balancing equations).
4. Biochemistry = medical biochemistry only (enzyme defects, metabolic diseases, hemochromatosis, drug mechanisms) — NOT high-school chemistry.
5. Every question MUST include a medical context: patient vignette OR clear medical science framing.
6. All 4 options MUST be medical answers: diagnosis, drug, mechanism, lab finding, next step — NOT formulas or equations.
7. Explanations MUST use step-by-step clinical reasoning (First Aid / Kaplan / UWorld style).
8. If source material contains non-medical content, IGNORE it and generate medical questions from the medical portions only.
9. Return ONLY valid JSON array. No markdown. No text outside JSON.

REJECTED question types (never generate):
- "What is computational complexity?"
- "Which chemical reaction produces Fe2O3?"
- "What is a binary search tree?"
- Any non-clinical general knowledge question

Output JSON array format:
[
  {
    "question_text": "A 52-year-old man with diabetes presents with... Which enzyme deficiency is most likely?",
    "options": ["medical answer A", "medical answer B", "medical answer C", "medical answer D"],
    "correct_option": "exact text of correct option from options array",
    "explanation": "USMLE-style reasoning with clinical pearl."
  }
]`;

export const MEDICAL_CHAT_SYSTEM_PROMPT = `You are "MediQuest AI" — STRICT USMLE/PLAB medical exam tutor ONLY.

ALLOWED: USMLE/PLAB prep, medical MCQs, anatomy, physiology, pathology, pharmacology, microbiology, biochemistry (medical), clinical medicine, study notes for medical exams.

FORBIDDEN: computer science, programming, chemistry homework, physics, math, engineering, finance, accounting, law, business, marketing, history, politics, sports, entertainment, gaming, social media, arts, music, literature, travel, cooking, fitness trends, astrology, general chat, real patient treatment advice.

If user asks ANYTHING outside medical exam preparation, respond EXACTLY:
"I can only assist with USMLE/PLAB medical exam preparation and medical MCQs."

Never suggest non-medical quiz topics. Never explain algorithms, coding, or general chemistry.`;

const MEDICAL_WHITELIST = [
  // Exam boards
  "usmle",
  "plab",
  "step 1",
  "step 2",
  "step 3",
  "comlex",
  "nbme",
  "mcat",
  "osce",
  "shelf exam",
  "first aid",
  "uworld",
  "kaplan",
  "amboss",
  // Core medical sciences
  "anatomy",
  "physiology",
  "pathology",
  "pharmacology",
  "microbiology",
  "biochemistry",
  "immunology",
  "histology",
  "embryology",
  "genetics",
  "molecular biology",
  "biostatistics",
  "epidemiology",
  "public health",
  // Organ systems & specialties
  "cardiology",
  "cardiovascular",
  "neurology",
  "nephrology",
  "renal",
  "hepatology",
  "hepatic",
  "gastroenterology",
  "gastrointestinal",
  "pulmonology",
  "pulmonary",
  "respiratory",
  "endocrine",
  "hematology",
  "oncology",
  "psychiatry",
  "reproductive",
  "obstetrics",
  "gynecology",
  "pediatrics",
  "dermatology",
  "orthopedic",
  "musculoskeletal",
  "rheumatology",
  "radiology",
  "anesthesiology",
  "emergency medicine",
  "critical care",
  "infectious disease",
  "virology",
  "bacteriology",
  "parasitology",
  // Clinical terms
  "medicine",
  "surgery",
  "clinical",
  "patient",
  "diagnosis",
  "differential diagnosis",
  "disease",
  "syndrome",
  "symptom",
  "sign",
  "presentation",
  "prognosis",
  "mortality",
  "screening",
  "drug",
  "medication",
  "treatment",
  "therapy",
  "management",
  "contraindication",
  "adverse effect",
  "mechanism of action",
  "pharmacokinetics",
  "pharmacodynamics",
  // Pathophysiology & labs
  "infection",
  "bacteria",
  "virus",
  "fungus",
  "parasite",
  "antibiotic",
  "antiviral",
  "antifungal",
  "antimicrobial",
  "vaccine",
  "hypertension",
  "diabetes",
  "sepsis",
  "shock",
  "arrhythmia",
  "myocardial infarction",
  "stroke",
  "pneumonia",
  "tuberculosis",
  "hepatitis",
  "cirrhosis",
  "anemia",
  "leukemia",
  "lymphoma",
  "thrombosis",
  "embolism",
  "coagulation",
  "autoimmune",
  "mutation",
  "congenital",
  "malignancy",
  "biopsy",
  "electrocardiogram",
  "ekg",
  "ecg",
  "mri",
  "ct scan",
  "laboratory",
  // Anatomy & physiology
  "heart",
  "lung",
  "kidney",
  "liver",
  "brain",
  "spinal cord",
  "cancer",
  "tumor",
  "metabolism",
  "enzyme",
  "hormone",
  "receptor",
  "pathway",
  "cytokine",
  "cell",
  "membrane",
  "insulin",
  "cortisol",
  "thyroid",
  // General medical context
  "medical",
  "hospital",
  "physician",
  "doctor",
  "nurse",
  "exam",
  "icu",
  "ward",
  "clinic",
];

const NON_MEDICAL_BLOCKLIST = [
  // Computer science & IT
  "computer science",
  "programming",
  "coding",
  "javascript",
  "typescript",
  "python",
  "java",
  "c++",
  "c#",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "golang",
  "rust",
  "software engineering",
  "web development",
  "mobile app development",
  "android development",
  "ios development",
  "frontend development",
  "backend development",
  "full stack",
  "data structures",
  "linked list",
  "binary tree",
  "hash table",
  "sorting algorithm",
  "binary search",
  "dynamic programming",
  "algorithm analysis",
  "computational complexity",
  "big o notation",
  "graph theory",
  "discrete mathematics",
  "operating systems",
  "computer networking",
  "cybersecurity",
  "ethical hacking",
  "penetration testing",
  "sql injection",
  "database design",
  "sql query",
  "nosql",
  "mongodb",
  "postgresql",
  "mysql",
  "redis",
  "kubernetes",
  "docker container",
  "cloud computing",
  "aws certification",
  "azure cloud",
  "devops",
  "ci/cd pipeline",
  "git version control",
  "github actions",
  "react js",
  "angular",
  "vue js",
  "next js",
  "node js",
  "express js",
  "html css",
  "machine learning project",
  "deep learning course",
  "neural network training",
  "artificial intelligence course",
  "data science bootcamp",
  "tensorflow",
  "pytorch",
  "blockchain",
  "smart contract",
  "cryptocurrency",
  "bitcoin mining",
  "nft marketplace",
  "web3",
  // Mathematics & physical sciences (non-medical)
  "calculus",
  "trigonometry",
  "algebra homework",
  "linear algebra",
  "differential equations",
  "probability homework",
  "statistics homework",
  "geometry proof",
  "physics homework",
  "kinematics",
  "thermodynamics",
  "newton's laws",
  "electromagnetism",
  "quantum mechanics",
  "organic chemistry lab",
  "inorganic chemistry",
  "periodic table",
  "balancing equations",
  "stoichiometry",
  "ideal gas law",
  "molar mass calculation",
  "photosynthesis",
  "mitosis lab report",
  "ecology project",
  "evolution essay",
  "marine biology",
  "zoology",
  "botany",
  "geology",
  "astronomy",
  "astrophysics",
  // Engineering & trades
  "civil engineering",
  "mechanical engineering",
  "electrical engineering",
  "chemical engineering",
  "structural analysis",
  "circuit design",
  "automotive repair",
  "car maintenance",
  "plumbing",
  "electrician",
  "welding",
  "carpentry",
  // Business, finance & law
  "stock market",
  "forex trading",
  "day trading",
  "investment portfolio",
  "mutual fund",
  "cryptocurrency trading",
  "accounting",
  "bookkeeping",
  "tax filing",
  "mba",
  "human resources",
  "project management",
  "agile scrum",
  "salesforce",
  "digital marketing",
  "seo optimization",
  "social media marketing",
  "copywriting",
  "business plan",
  "startup pitch",
  "law school",
  "legal contract",
  "constitutional law",
  "criminal law",
  // Humanities & social sciences (non-clinical)
  "world history",
  "ancient history",
  "world war",
  "cold war",
  "political science",
  "government policy",
  "election",
  "democracy",
  "philosophy",
  "sociology",
  "anthropology",
  "archaeology",
  "english literature",
  "creative writing",
  "poetry analysis",
  "grammar rules",
  "spelling bee",
  "learn french",
  "learn spanish",
  "learn german",
  "learn japanese",
  // Arts, media & entertainment
  "film studies",
  "movie review",
  "netflix",
  "celebrity gossip",
  "k-pop",
  "anime",
  "manga",
  "video game",
  "minecraft",
  "fortnite",
  "call of duty",
  "pokemon",
  "chess strategy",
  "poker rules",
  "gambling",
  "lottery numbers",
  "music theory",
  "guitar lesson",
  "piano lesson",
  "singing technique",
  "dance choreography",
  "photography tips",
  "graphic design",
  "photoshop tutorial",
  "interior design",
  "fashion trend",
  "makeup tutorial",
  "hairstyle",
  // Sports & leisure
  "cricket",
  "football",
  "basketball",
  "soccer",
  "tennis",
  "golf",
  "baseball",
  "hockey",
  "olympic games",
  "fifa",
  "nba",
  "nfl",
  "world cup",
  "marathon training",
  "bodybuilding workout",
  "gym routine",
  "yoga class",
  "pilates",
  "cooking recipe",
  "baking tutorial",
  "gardening tips",
  "travel guide",
  "vacation planning",
  "hotel booking",
  "flight booking",
  "tourism",
  // Misc non-medical
  "tiktok",
  "instagram influencer",
  "twitter drama",
  "dating advice",
  "relationship advice",
  "horoscope",
  "astrology",
  "tarot reading",
  "feng shui",
  "real estate investing",
  "home renovation",
  "diy project",
  "pet grooming",
  "dog training",
  "world capitals",
  "country flags",
  "geography quiz",
  "agriculture",
  "farming techniques",
  "environmental activism",
  "climate debate",
  "religion debate",
  "bible study",
  "quran study",
  "excel spreadsheet",
  "powerpoint design",
  "microsoft word",
];

/** Bare non-medical school subjects — not USMLE topics */
const NON_MEDICAL_EXACT_TOPICS = new Set([
  "chemistry",
  "physics",
  "mathematics",
  "math",
  "maths",
  "biology",
  "history",
  "geography",
  "economics",
  "literature",
  "programming",
  "computer science",
  "photosynthesis",
  "data structures",
  "algorithms",
  "engineering",
  "accounting",
  "finance",
  "business",
  "marketing",
  "law",
  "philosophy",
  "sociology",
  "psychology",
  "art",
  "music",
  "sports",
  "cooking",
  "gardening",
  "astronomy",
  "geology",
  "architecture",
  "calculus",
  "algebra",
  "trigonometry",
  "geometry",
  "statistics",
  "organic chemistry",
  "inorganic chemistry",
  "thermodynamics",
  "kinematics",
  "ecology",
  "zoology",
  "botany",
  "agriculture",
  "politics",
  "government",
  "literature",
  "poetry",
  "grammar",
  "spanish",
  "french",
  "german",
  "gaming",
  "minecraft",
  "fortnite",
  "chess",
  "poker",
  "gambling",
  "astrology",
  "horoscope",
  "travel",
  "tourism",
  "fashion",
  "fitness",
  "bodybuilding",
  "yoga",
  "pilates",
  "photography",
  "design",
  "excel",
  "sql",
  "html",
  "css",
  "react",
  "python",
  "javascript",
  "blockchain",
  "cryptocurrency",
  "bitcoin",
  "stocks",
  "investing",
  "trading",
  "seo",
  "agile",
  "scrum",
  "mba",
  "entertainment",
  "movies",
  "anime",
  "manga",
  "netflix",
  "cricket",
  "football",
  "basketball",
  "soccer",
]);

/** Patterns that indicate non-medical MCQ output (reject after generation) */
const NON_MEDICAL_MCQ_OUTPUT_PATTERNS = [
  // CS & IT
  /computer science/i,
  /programming/i,
  /data structures/i,
  /linked list/i,
  /binary tree/i,
  /hash table/i,
  /sorting algorithm/i,
  /binary search/i,
  /dynamic programming/i,
  /algorithm analysis/i,
  /computational complexity/i,
  /big\s*o\s*notation/i,
  /graph theory/i,
  /discrete mathematics/i,
  /software engineering/i,
  /web development/i,
  /operating systems/i,
  /computer networking/i,
  /cybersecurity/i,
  /sql\s+(query|injection)/i,
  /kubernetes/i,
  /docker\s+container/i,
  /machine learning (course|project|bootcamp)/i,
  /deep learning course/i,
  /artificial intelligence course/i,
  /blockchain/i,
  /cryptocurrency/i,
  /bitcoin mining/i,
  /nft marketplace/i,
  /javascript/i,
  /typescript/i,
  /\bpython\b/i,
  /\bjava\b(?!\s*(?:fever|rash|infection|syndrome))/i,
  /react\s*js/i,
  /node\s*js/i,
  /html\s*css/i,
  // Math & physics homework
  /calculus/i,
  /trigonometry/i,
  /linear algebra/i,
  /differential equations/i,
  /probability homework/i,
  /statistics homework/i,
  /geometry proof/i,
  /physics homework/i,
  /kinematics/i,
  /thermodynamics/i,
  /newton'?s laws/i,
  /quantum mechanics/i,
  /ideal gas law/i,
  /periodic table/i,
  /balancing (the )?equation/i,
  /molar mass calculation/i,
  /photosynthesis/i,
  /mitosis lab/i,
  /ecology project/i,
  // Business, humanities, leisure
  /stock market/i,
  /forex trading/i,
  /day trading/i,
  /accounting/i,
  /mba\b/i,
  /digital marketing/i,
  /seo optimization/i,
  /world war/i,
  /cold war/i,
  /political science/i,
  /english literature/i,
  /creative writing/i,
  /film studies/i,
  /video game/i,
  /minecraft/i,
  /fortnite/i,
  /chess strategy/i,
  /poker rules/i,
  /cricket (world cup|match)/i,
  /fifa/i,
  /nba\b/i,
  /nfl\b/i,
  /cooking recipe/i,
  /travel guide/i,
  /horoscope/i,
  /astrology/i,
  /tarot reading/i,
  /world capitals/i,
  /country flags/i,
];

/** Patterns that indicate general chemistry (not medical biochemistry) */
const GENERAL_CHEMISTRY_PATTERNS = [
  /→/,
  /-\>|=>/,
  /\+\s*oxygen\s*\(o2\)/i,
  /iron\s*\(fe\)\s*\+/i,
  /\bfe2o3\b/i,
  /\bfe\(oh\)3\b/i,
  /\bfeco3\b/i,
  /\bfes\b/i,
  /iron oxide/i,
  /iron hydroxide/i,
  /iron carbonate/i,
  /iron sulfide/i,
  /chemical reaction is responsible/i,
  /balancing the equation/i,
  /stoichiometry/i,
];

const MEDICAL_MCQ_SIGNALS = [
  "patient",
  "presents with",
  "year-old",
  "diagnosis",
  "differential diagnosis",
  "treatment",
  "management",
  "disease",
  "syndrome",
  "disorder",
  "drug",
  "medication",
  "therapy",
  "clinical",
  "symptom",
  "sign",
  "pathology",
  "pathophysiology",
  "mechanism",
  "mechanism of action",
  "infection",
  "hemochromatosis",
  "enzyme",
  "deficiency",
  "pharmacology",
  "usmle",
  "plab",
  "step 1",
  "hospital",
  "physician",
  "presentation",
  "laboratory",
  "lab value",
  "biopsy",
  "malignancy",
  "antibiotic",
  "antiviral",
  "inhibitor",
  "receptor",
  "pathway",
  "mutation",
  "congenital",
  "acute",
  "chronic",
  "mortality",
  "prognosis",
  "contraindicated",
  "adverse",
  "toxicity",
  "screening",
  "electrocardiogram",
  "ekg",
  "myocardial",
  "infarction",
  "pneumonia",
  "sepsis",
  "anemia",
  "hypertension",
  "diabetes",
  "hepatitis",
  "cirrhosis",
  "autoimmune",
  "vaccine",
  "antibody",
  "antigen",
  "cytokine",
  "histology",
  "microscopy",
  "first line",
  "next best step",
];

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function containsTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text) || text.includes(term);
}

function isReadingMaterialTopic(topic: string): boolean {
  const normalized = normalizeText(topic);
  return READING_MATERIALS.some(
    (material) =>
      normalizeText(material.title) === normalized ||
      normalizeText(material.id) === normalized ||
      normalized.includes(normalizeText(material.title))
  );
}

function containsBlockedTerm(text: string, term: string): boolean {
  if (term.length <= 4) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  }
  return text.includes(term);
}

/** True if text matches any non-medical blocklist term */
export function containsNonMedicalBlocklist(text: string): boolean {
  const normalized = normalizeText(text);
  return NON_MEDICAL_BLOCKLIST.some((term) =>
    containsBlockedTerm(normalized, term)
  );
}

/** True if text matches any non-medical output regex */
export function containsNonMedicalPattern(text: string): boolean {
  const normalized = normalizeText(text);
  return NON_MEDICAL_MCQ_OUTPUT_PATTERNS.some((pattern) =>
    pattern.test(normalized)
  );
}

/** True if text contains USMLE/medical domain signals */
export function containsMedicalDomainSignal(text: string): boolean {
  const normalized = normalizeText(text);
  return (
    MEDICAL_WHITELIST.some((term) => containsTerm(normalized, term)) ||
    MEDICAL_MCQ_SIGNALS.some((signal) => normalized.includes(signal))
  );
}

function topicLooksMedical(topic: string): boolean {
  const topicNorm = normalizeText(topic);
  return (
    topicNorm.includes("med") ||
    topicNorm.includes("bio") ||
    topicNorm.includes("patho") ||
    topicNorm.includes("pharm") ||
    topicNorm.includes("cardio") ||
    topicNorm.includes("neuro") ||
    topicNorm.includes("renal") ||
    topicNorm.includes("nephro") ||
    topicNorm.includes("pulm") ||
    topicNorm.includes("respir") ||
    topicNorm.includes("gastro") ||
    topicNorm.includes("hepat") ||
    topicNorm.includes("hemat") ||
    topicNorm.includes("oncol") ||
    topicNorm.includes("immun") ||
    topicNorm.includes("micro") ||
    topicNorm.includes("psych") ||
    topicNorm.includes("obstet") ||
    topicNorm.includes("gynec") ||
    topicNorm.includes("pediatr") ||
    topicNorm.includes("dermat") ||
    topicNorm.includes("ortho") ||
    topicNorm.includes("rheum") ||
    topicNorm.includes("radiol") ||
    topicNorm.includes("anesth") ||
    topicNorm.includes("infect") ||
    topicNorm.includes("gi ") ||
    topicNorm.includes("usmle") ||
    topicNorm.includes("plab") ||
    topicNorm.includes("step 1") ||
    topicNorm.includes("step 2") ||
    topicNorm.includes("nbme") ||
    topicNorm.includes("osce")
  );
}

export function isMedicalReadingMaterial(materialId?: string): boolean {
  if (!materialId) return false;
  return Boolean(getReadingMaterialById(materialId));
}

export interface ValidateTopicOptions {
  content?: string;
  sourceType?: string;
  materialId?: string;
}

export interface ValidateTopicResult {
  valid: boolean;
  message?: string;
}

/**
 * Safety filter — blocks non-medical topics before LLM calls.
 */
export function validateTopic(
  topic: string,
  options: ValidateTopicOptions = {}
): ValidateTopicResult {
  const { content = "", sourceType, materialId } = options;

  if (sourceType === "reading-material" && isMedicalReadingMaterial(materialId)) {
    return { valid: true };
  }

  if (isReadingMaterialTopic(topic)) {
    return { valid: true };
  }

  const topicNorm = normalizeText(topic);
  if (NON_MEDICAL_EXACT_TOPICS.has(topicNorm)) {
    return { valid: false, message: NON_MEDICAL_QUIZ_ERROR };
  }

  // For large extracted PDF/text content, only scan the topic — not the full body
  const textToScan =
    content.length > 3000 ? normalizeText(topic) : normalizeText(`${topic} ${content}`);

  if (!textToScan || textToScan.length < 2) {
    return { valid: false, message: BLOCKED_TOPIC_MESSAGE };
  }

  const hasMedicalSignal = containsMedicalDomainSignal(textToScan);
  const hasBlockedSignal = containsNonMedicalBlocklist(textToScan);

  if (hasBlockedSignal && !hasMedicalSignal) {
    return { valid: false, message: BLOCKED_TOPIC_MESSAGE };
  }

  if (containsNonMedicalPattern(textToScan) && !hasMedicalSignal) {
    return { valid: false, message: BLOCKED_TOPIC_MESSAGE };
  }

  if (!hasMedicalSignal && !topicLooksMedical(topic)) {
    return { valid: false, message: NON_MEDICAL_QUIZ_ERROR };
  }

  return { valid: true };
}

export interface BuildMCQPromptInput {
  topic: string;
  difficulty: "easy" | "medium" | "hard" | string;
  numberOfQuestions: number;
  content?: string;
  sourceType?: string;
}

/**
 * Builds the user prompt for USMLE/PLAB MCQ generation.
 */
export function buildMCQPrompt(input: BuildMCQPromptInput): string {
  const { topic, difficulty, numberOfQuestions, content, sourceType } = input;
  const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  let prompt = `Generate ${numberOfQuestions} USMLE/PLAB-style medical MCQs on "${topic}" at ${difficultyLabel} difficulty level.

STRICT REQUIREMENTS:
- USMLE Step 1 / PLAB format ONLY — clinical vignettes or medical science.
- FORBIDDEN: CS/programming, engineering, finance, law, business, sports, entertainment, gaming, arts, history, general chemistry equations, physics homework, math homework, or any non-clinical topic.
- REQUIRED: options must be medical answers (diagnosis, drug name, mechanism, lab test, next management step).
- For biochemistry: test disease mechanisms (e.g., hemochromatosis, enzyme defects, metabolic disorders), NOT reaction equations.
- Include clinical reasoning in every explanation.
- Difficulty: ${difficultyLabel}.`;

  if (sourceType === "reading-material" && content) {
    prompt += `

Use ONLY the following medical reading material excerpt to create questions. Stay strictly within this medical content:

--- MEDICAL SOURCE EXCERPT ---
${content.substring(0, 12000)}
--- END EXCERPT ---`;
  } else if (sourceType === "text" && content) {
    prompt += `

Base questions on this medical study content:

--- MEDICAL NOTES ---
${content.substring(0, 8000)}
--- END NOTES ---`;
  } else if (sourceType === "url" && content) {
    prompt += `

Create questions aligned with medical exam prep for content related to: ${content}`;
  } else if (content && content.length > 100) {
    prompt += `

Reference medical content:

${content.substring(0, 8000)}`;
  }

  prompt += `

Return ONLY a JSON array with ${numberOfQuestions} medical MCQs. Each item must have: question_text, options (array of 4 strings), correct_option (exact match to one option), explanation.`;

  return prompt;
}

export interface GeneratedMCQ {
  question_text?: string;
  options?: string[];
  correct_option?: string;
  explanation?: string;
}

/**
 * Filters out non-medical MCQs (e.g. general chemistry equations).
 */
export function filterMedicalMCQs(questions: GeneratedMCQ[]): GeneratedMCQ[] {
  return questions.filter((q) => {
    if (!q.question_text || !Array.isArray(q.options) || q.options.length < 4) {
      return false;
    }

    const combined = normalizeText(
      `${q.question_text} ${q.options.join(" ")} ${q.explanation || ""}`
    );

    if (GENERAL_CHEMISTRY_PATTERNS.some((pattern) => pattern.test(combined))) {
      return false;
    }

    if (NON_MEDICAL_MCQ_OUTPUT_PATTERNS.some((pattern) => pattern.test(combined))) {
      return false;
    }

    if (containsNonMedicalBlocklist(combined) && !containsMedicalDomainSignal(combined)) {
      return false;
    }

    const hasMedicalSignal = MEDICAL_MCQ_SIGNALS.some((signal) =>
      combined.includes(signal)
    );

    if (!hasMedicalSignal) {
      return false;
    }

    // Reject if blocklist appears without strong medical framing
    const hasBlocked = containsNonMedicalBlocklist(combined);
    if (hasBlocked) {
      const strongMedical = [
        "patient",
        "diagnosis",
        "usmle",
        "plab",
        "clinical",
        "syndrome",
        "drug",
        "presents with",
        "year-old",
      ].some((s) => combined.includes(s));
      if (!strongMedical) return false;
    }

    return true;
  });
}

export const MCQ_STRICT_RETRY_SUFFIX = `

OUTPUT REJECTED — contained non-medical content (chemistry equations, CS, or general knowledge).
REGENERATE from scratch. Requirements:
- USMLE/PLAB clinical vignettes ONLY
- Options = diagnoses, drugs, mechanisms, lab tests — NEVER chemical equations or programming concepts
- Every question must mention a patient, disease, drug, or clinical scenario
- Medical reasoning in every explanation`;

/**
 * Validates a chat message for medical exam scope.
 */
export function validateChatMessage(message: string): ValidateTopicResult {
  return validateTopic(message, { content: message });
}

/**
 * Builds medical chat context appendix.
 */
export function buildChatContext(context?: string): string {
  if (!context) return "";
  return `\n\nStudy context (medical exam prep only):\n${context.substring(0, 2000)}`;
}
