import Link from "next/link";
import { createCompanionAction } from "@/app/actions/studio";
import { initialCompanionState } from "@/app/actions/studio-state";
import { CompanionForm } from "@/components/studio/companion-form";
import { listCategories } from "@/db/companions";
import { requireUser } from "@/lib/session";

export const metadata = { title: "New companion" };

export default async function NewCompanionPage() {
  await requireUser();
  const categories = await listCategories();

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
      <Link href="/studio" className="text-sm text-muted hover:text-ink">
        ← Back to studio
      </Link>
      <p className="eyebrow mt-6">New companion</p>
      <h1 className="display mt-3 text-5xl">Give someone a voice.</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
        The details below become the prompt. Specific beats clever, and a boundary is worth more
        than a catchphrase.
      </p>

      <div className="mt-10">
        <CompanionForm
          action={createCompanionAction}
          initialState={initialCompanionState}
          categories={categories}
          mode="create"
        />
      </div>
    </div>
  );
}
