export type ReadingMaterialCategory =
  | "Basic Sciences"
  | "Organ Systems"
  | "Review";

export interface ReadingMaterial {
  id: string;
  title: string;
  description: string;
  category: ReadingMaterialCategory;
  fileName: string;
  filePath: string;
}

export const READING_MATERIALS: ReadingMaterial[] = [
  {
    id: "biochemistry",
    title: "Biochemistry",
    description: "Metabolism, molecular biology, and biochemical pathways for USMLE review.",
    category: "Basic Sciences",
    fileName: "biochemistry.pdf",
    filePath: "/reading-material/biochemistry.pdf",
  },
  {
    id: "immunology",
    title: "Immunology",
    description: "Immune system, hypersensitivity, immunodeficiencies, and autoimmune disease.",
    category: "Basic Sciences",
    fileName: "immunology.pdf",
    filePath: "/reading-material/immunology.pdf",
  },
  {
    id: "microbiology",
    title: "Microbiology",
    description: "Bacteria, viruses, fungi, parasites, and antimicrobial therapy.",
    category: "Basic Sciences",
    fileName: "microbiology.pdf",
    filePath: "/reading-material/microbiology.pdf",
  },
  {
    id: "pathology",
    title: "Pathology",
    description: "General pathology, inflammation, neoplasia, and disease mechanisms.",
    category: "Basic Sciences",
    fileName: "pathology.pdf",
    filePath: "/reading-material/pathology.pdf",
  },
  {
    id: "pharmacology",
    title: "Pharmacology",
    description: "Drug mechanisms, side effects, and high-yield pharmacology facts.",
    category: "Basic Sciences",
    fileName: "pharmacology.pdf",
    filePath: "/reading-material/pharmacology.pdf",
  },
  {
    id: "public-health-sciences",
    title: "Public Health Sciences",
    description: "Biostatistics, epidemiology, ethics, and healthcare delivery.",
    category: "Basic Sciences",
    fileName: "public-health-sciences.pdf",
    filePath: "/reading-material/public-health-sciences.pdf",
  },
  {
    id: "cardiovascular",
    title: "Cardiovascular",
    description: "Heart disease, vascular disorders, ECG concepts, and cardiology pearls.",
    category: "Organ Systems",
    fileName: "cardiovascular.pdf",
    filePath: "/reading-material/cardiovascular.pdf",
  },
  {
    id: "endocrine",
    title: "Endocrine",
    description: "Hormones, diabetes, thyroid, adrenal, and endocrine disorders.",
    category: "Organ Systems",
    fileName: "endocrine.pdf",
    filePath: "/reading-material/endocrine.pdf",
  },
  {
    id: "gastrointestinal",
    title: "Gastrointestinal",
    description: "GI tract, liver, pancreas, and digestive system pathology.",
    category: "Organ Systems",
    fileName: "gastrointestinal.pdf",
    filePath: "/reading-material/gastrointestinal.pdf",
  },
  {
    id: "hematology-oncology",
    title: "Hematology & Oncology",
    description: "Blood disorders, coagulation, anemias, and oncology fundamentals.",
    category: "Organ Systems",
    fileName: "hematology-oncology.pdf",
    filePath: "/reading-material/hematology-oncology.pdf",
  },
  {
    id: "musculoskeletal-skin-connective-tissue",
    title: "Musculoskeletal, Skin & Connective Tissue",
    description: "MSK anatomy, dermatology, rheumatology, and connective tissue disease.",
    category: "Organ Systems",
    fileName: "musculoskeletal-skin-connective-tissue.pdf",
    filePath: "/reading-material/musculoskeletal-skin-connective-tissue.pdf",
  },
  {
    id: "neurology-special-sciences",
    title: "Neurology & Special Senses",
    description: "Neurology, ophthalmology, and otology high-yield content.",
    category: "Organ Systems",
    fileName: "neurology-special-sciences.pdf",
    filePath: "/reading-material/neurology-special-sciences.pdf",
  },
  {
    id: "psychiatry",
    title: "Psychiatry",
    description: "Psychiatric disorders, psychopharmacology, and mental health topics.",
    category: "Organ Systems",
    fileName: "psychiatry.pdf",
    filePath: "/reading-material/psychiatry.pdf",
  },
  {
    id: "renal",
    title: "Renal",
    description: "Kidney physiology, electrolytes, acid-base, and renal pathology.",
    category: "Organ Systems",
    fileName: "renal.pdf",
    filePath: "/reading-material/renal.pdf",
  },
  {
    id: "reproductive",
    title: "Reproductive",
    description: "OB/GYN, reproductive endocrinology, and urogenital disorders.",
    category: "Organ Systems",
    fileName: "reproductive.pdf",
    filePath: "/reading-material/reproductive.pdf",
  },
  {
    id: "respiratory",
    title: "Respiratory",
    description: "Pulmonary physiology, lung pathology, and respiratory emergencies.",
    category: "Organ Systems",
    fileName: "respiratory.pdf",
    filePath: "/reading-material/respiratory.pdf",
  },
  {
    id: "first-aid-usmle-step-1-2017",
    title: "First Aid USMLE Step 1 (2017)",
    description: "Comprehensive USMLE Step 1 review guide covering all major topics.",
    category: "Review",
    fileName: "first-aid-usmle-step-1-2017.pdf",
    filePath: "/reading-material/first-aid-usmle-step-1-2017.pdf",
  },
];

export function getReadingMaterialById(id: string): ReadingMaterial | undefined {
  return READING_MATERIALS.find((material) => material.id === id);
}

export const READING_MATERIAL_CATEGORIES: ReadingMaterialCategory[] = [
  "Basic Sciences",
  "Organ Systems",
  "Review",
];
