import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCompanionAction } from "@/app/actions/studio";
import { initialCompanionState } from "@/app/actions/studio-state";
import { CompanionForm } from "@/components/studio/companion-form";
import { getOwnedCompanion, listCategories } from "@/db/companions";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Edit companion" };

export default async function EditCompanionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await params;

  const [companion, categories] = await Promise.all([
    getOwnedCompanion(id, session.user.id),
    listCategories(),
  ]);

  if (!companion) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
      <Link href="/studio" className="text-sm text-muted hover:text-ink">
        ← Back to studio
      </Link>
      <p className="eyebrow mt-6">Edit companion</p>
      <h1 className="display mt-3 text-5xl">{companion.name}</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
        Changes apply to the next message. Past conversations keep what was said.
      </p>

      <div className="mt-10">
        <CompanionForm
          action={updateCompanionAction}
          initialState={initialCompanionState}
          categories={categories}
          mode="edit"
          companion={{
            id: companion.id,
            name: companion.name,
            tagline: companion.tagline,
            description: companion.description,
            categoryId: companion.categoryId,
            imageUrl: companion.imageUrl,
            greeting: companion.greeting,
            instructions: companion.instructions,
            examples: companion.examples,
            visibility: companion.visibility,
          }}
        />
      </div>
    </div>
  );
}
