"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { collectFieldErrors, companionFormSchema, parseExamples } from "@/domain/companion";
import type { CompanionActionState } from "@/app/actions/studio-state";
import { initialCompanionState } from "@/app/actions/studio-state";
import {
  countConversations,
  countMemories,
  createCompanion,
  deleteCompanion,
  getOwnedCompanion,
  listCategories,
  listOwnedCompanions,
  updateCompanion,
} from "@/db/companions";
import { getSession, requireUserForAction } from "@/lib/session";

function readForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    tagline: String(formData.get("tagline") ?? ""),
    description: String(formData.get("description") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    greeting: String(formData.get("greeting") ?? ""),
    instructions: String(formData.get("instructions") ?? ""),
    examples: parseExamples(String(formData.get("examples") ?? "")),
    visibility: String(formData.get("visibility") ?? "public"),
  };
}

async function validate(formData: FormData) {
  const parsed = companionFormSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return {
      data: null,
      state: {
        status: "error" as const,
        message: "Check the highlighted fields.",
        errors: collectFieldErrors(parsed.error),
      },
    };
  }

  const categories = await listCategories();
  if (!categories.some((category) => category.id === parsed.data.categoryId)) {
    return {
      data: null,
      state: {
        status: "error" as const,
        message: "Choose a valid category.",
        errors: { categoryId: ["Choose a valid category."] },
      },
    };
  }

  return { data: parsed.data, state: null };
}

export async function createCompanionAction(
  _state: CompanionActionState,
  formData: FormData,
): Promise<CompanionActionState> {
  const session = await requireUserForAction("/studio/new");
  const result = await validate(formData);
  if (!result.data) return result.state ?? initialCompanionState;

  const created = await createCompanion(session.user.id, result.data);
  revalidatePath("/studio");
  revalidatePath("/explore");
  redirect(created ? `/studio?created=${created.slug}` : "/studio");
}

export async function updateCompanionAction(
  _state: CompanionActionState,
  formData: FormData,
): Promise<CompanionActionState> {
  const id = String(formData.get("id") ?? "");
  const session = await requireUserForAction(`/studio/${id}/edit`);
  const result = await validate(formData);
  if (!result.data) return result.state ?? initialCompanionState;

  const updated = await updateCompanion(id, session.user.id, result.data);
  if (!updated) {
    return { status: "error", message: "Companion not found, or it is not yours." };
  }

  revalidatePath("/studio");
  revalidatePath("/explore");
  revalidatePath(`/c/${updated.slug}`);
  redirect("/studio?updated=1");
}

export async function deleteCompanionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const session = await requireUserForAction("/studio");
  await deleteCompanion(id, session.user.id);
  revalidatePath("/studio");
  revalidatePath("/explore");
  redirect("/studio?deleted=1");
}

export async function getStudioPageData() {
  const session = await getSession();
  if (!session) return null;

  const [companions, conversationCount, memoryCount] = await Promise.all([
    listOwnedCompanions(session.user.id),
    countConversations(session.user.id),
    countMemories(session.user.id),
  ]);

  return { companions, conversationCount, memoryCount };
}

export async function getNewStudioData() {
  const session = await getSession();
  if (!session) return null;

  const categories = await listCategories();
  return { categories };
}

export async function getEditStudioData(id: string) {
  const session = await getSession();
  if (!session) return null;

  const [companion, categories] = await Promise.all([
    getOwnedCompanion(id, session.user.id),
    listCategories(),
  ]);

  if (!companion) return null;
  return { companion, categories };
}
