"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type { LanguageItem } from "@/lib/types/cv";

interface SectionLanguagesProps {
  languages: LanguageItem[];
  onChange: (languages: LanguageItem[]) => void;
}

const proficiencyLevels = [
  "Native",
  "Fluent",
  "Advanced",
  "Intermediate",
  "Basic",
];

export function SectionLanguages({
  languages = [],
  onChange,
}: SectionLanguagesProps) {
  const safeLanguages = languages || []
  const addLanguage = () => {
    onChange([
      ...safeLanguages,
      {
        id: crypto.randomUUID(),
        language: "",
        proficiency: "Intermediate",
      },
    ]);
  };

  const updateLanguage = (
    id: string,
    field: keyof LanguageItem,
    value: string
  ) => {
    onChange(
      safeLanguages.map((lang) =>
        lang.id === id ? { ...lang, [field]: value } : lang
      )
    );
  };

  const removeLanguage = (id: string) => {
    onChange(safeLanguages.filter((lang) => lang.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Languages</h3>
        <Button onClick={addLanguage} variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Language
        </Button>
      </div>

      {safeLanguages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add languages to showcase your linguistic abilities.
        </p>
      ) : (
        <div className="space-y-3">
          {safeLanguages.map((lang) => (
            <Card key={lang.id}>
              <CardContent className="pt-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`lang-name-${lang.id}`}>Language</Label>
                    <Input
                      id={`lang-name-${lang.id}`}
                      value={lang.language}
                      onChange={(e) =>
                        updateLanguage(lang.id, "language", e.target.value)
                      }
                      placeholder="e.g., Spanish"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`lang-prof-${lang.id}`}>Proficiency</Label>
                    <Select
                      value={lang.proficiency}
                      onValueChange={(value) =>
                        updateLanguage(lang.id, "proficiency", value)
                      }
                    >
                      <SelectTrigger id={`lang-prof-${lang.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {proficiencyLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLanguage(lang.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
