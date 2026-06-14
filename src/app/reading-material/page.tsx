"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  READING_MATERIALS,
  READING_MATERIAL_CATEGORIES,
  type ReadingMaterial,
} from "@/lib/reading-materials";
import {
  BookOpen,
  FileText,
  Search,
  Sparkles,
  ExternalLink,
  Library,
} from "lucide-react";
import { motion } from "framer-motion";

export default function ReadingMaterialPage() {
  const [search, setSearch] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<ReadingMaterial | null>(null);

  const filteredMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return READING_MATERIALS;
    return READING_MATERIALS.filter(
      (material) =>
        material.title.toLowerCase().includes(query) ||
        material.description.toLowerCase().includes(query) ||
        material.category.toLowerCase().includes(query)
    );
  }, [search]);

  const groupedMaterials = useMemo(() => {
    return READING_MATERIAL_CATEGORIES.map((category) => ({
      category,
      items: filteredMaterials.filter((material) => material.category === category),
    })).filter((group) => group.items.length > 0);
  }, [filteredMaterials]);

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="max-w-6xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 shadow-lg">
                    <Library className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    Reading Material
                  </h1>
                </div>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
                  Study from curated medical PDFs and use them as content sources when generating quizzes.
                </p>
              </div>
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search subjects..."
                  className="pl-10"
                />
              </div>
            </div>

            <Card className="border-teal-100 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50">
              <CardContent className="pt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-teal-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">How to use</p>
                    <p className="text-sm text-gray-600">
                      Open any PDF to study, then click &quot;Generate Quiz&quot; to create MCQs from that material.
                    </p>
                  </div>
                </div>
                <Link href="/create-quiz?source=reading-material">
                  <Button className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 text-white">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Quiz from Material
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {groupedMaterials.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No reading materials match your search.
              </CardContent>
            </Card>
          ) : (
            groupedMaterials.map((group, groupIndex) => (
              <motion.section
                key={group.category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.08 }}
                className="space-y-4"
              >
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  {group.category}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {group.items.map((material) => (
                    <Card
                      key={material.id}
                      className="hover:shadow-lg transition-shadow border-gray-200 bg-white/90 backdrop-blur-sm"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-teal-100 text-teal-700">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-lg leading-tight">{material.title}</CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">
                              {material.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMaterial(material)}
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Study PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a href={material.filePath} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white"
                          asChild
                        >
                          <Link href={`/create-quiz?source=reading-material&material=${material.id}`}>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Quiz
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.section>
            ))
          )}
        </div>

        <Dialog open={!!selectedMaterial} onOpenChange={(open) => !open && setSelectedMaterial(null)}>
          <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{selectedMaterial?.title}</DialogTitle>
              <DialogDescription>{selectedMaterial?.description}</DialogDescription>
            </DialogHeader>
            {selectedMaterial && (
              <div className="flex-1 min-h-0 rounded-lg border overflow-hidden bg-gray-50">
                <iframe
                  src={selectedMaterial.filePath}
                  title={selectedMaterial.title}
                  className="w-full h-full"
                />
              </div>
            )}
            {selectedMaterial && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" asChild>
                  <a href={selectedMaterial.filePath} target="_blank" rel="noopener noreferrer">
                    Open in New Tab
                  </a>
                </Button>
                <Button asChild className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                  <Link href={`/create-quiz?source=reading-material&material=${selectedMaterial.id}`}>
                    Generate Quiz from this PDF
                  </Link>
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
