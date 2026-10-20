import type { FieldErrors } from "@/domain/companion";

export type CompanionActionState = {
  status: "idle" | "error";
  message?: string;
  errors?: FieldErrors;
};

export const initialCompanionState: CompanionActionState = { status: "idle" };
