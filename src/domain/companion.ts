import { z } from "zod";
import type { CompanionExample } from "@/db/schema";

export const COMPANION_LIMITS = {
  name: { min: 2, max: 60 },
  tagline: { min: 8, max: 120 },
  description: { min: 30, max: 2000 },
  greeting: { min: 2, max: 500 },
  instructions: { min: 30, max: 6000 },
  examples: 4,
} as const;

export const companionExampleSchema = z.object({
  user: z.string().trim().min(1).max(500),
  assistant: z.string().trim().min(1).max(1000),
});

export const companionFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(COMPANION_LIMITS.name.min, "Name needs at least 2 characters.")
    .max(COMPANION_LIMITS.name.max, "Name is too long."),
  tagline: z
    .string()
    .trim()
    .min(COMPANION_LIMITS.tagline.min, "Add a short line that sets the tone.")
    .max(COMPANION_LIMITS.tagline.max, "Tagline is too long."),
  description: z
    .string()
    .trim()
    .min(COMPANION_LIMITS.description.min, "Describe the companion in at least 30 characters.")
    .max(COMPANION_LIMITS.description.max, "Description is too long."),
  categoryId: z.string().uuid("Choose a category."),
  imageUrl: z
    .string()
    .trim()
    .url("Use a full image URL.")
    .refine((value) => value.startsWith("https://") || value.startsWith("http://"), {
      message: "Image URL must use http or https.",
    }),
  greeting: z
    .string()
    .trim()
    .min(COMPANION_LIMITS.greeting.min, "Add an opening line.")
    .max(COMPANION_LIMITS.greeting.max, "Greeting is too long."),
  instructions: z
    .string()
    .trim()
    .min(
      COMPANION_LIMITS.instructions.min,
      "Give the companion at least 30 characters of direction.",
    )
    .max(COMPANION_LIMITS.instructions.max, "Instructions are too long."),
  examples: z.array(companionExampleSchema).max(COMPANION_LIMITS.examples),
  visibility: z.enum(["public", "private"]),
});

export type CompanionFormInput = z.infer<typeof companionFormSchema>;
export type CompanionFormField = keyof CompanionFormInput;

export type FieldErrors = Partial<Record<CompanionFormField, string[]>>;

export function collectFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;
    const key = field as CompanionFormField;
    errors[key] = [...(errors[key] ?? []), issue.message];
  }

  return errors;
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function parseExamples(raw: string): CompanionExample[] {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const examples: CompanionExample[] = [];

  for (const line of lines) {
    const separator = line.indexOf("|");
    if (separator === -1) continue;
    const user = line.slice(0, separator).trim();
    const assistant = line.slice(separator + 1).trim();
    if (!user || !assistant) continue;
    examples.push({ user, assistant });
  }

  return examples.slice(0, COMPANION_LIMITS.examples);
}

export function serializeExamples(examples: CompanionExample[]): string {
  return examples.map((example) => `${example.user} | ${example.assistant}`).join("\n");
}
