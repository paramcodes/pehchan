"use client";

import { deleteCompanionAction } from "@/app/actions/studio";

export function DeleteCompanionButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteCompanionAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${name}? Conversations and memories go with them.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-full border border-transparent px-3 py-1.5 text-xs text-muted transition-colors hover:border-danger/30 hover:text-danger"
      >
        Delete
      </button>
    </form>
  );
}
