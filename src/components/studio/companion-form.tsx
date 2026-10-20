"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, Description, FieldError, Input, Label, TextArea, TextField } from "@heroui/react";
import type { CompanionActionState } from "@/app/actions/studio-state";
import type { Category } from "@/domain/catalogue";
import type { CompanionExample } from "@/domain/companion";
import { serializeExamples } from "@/domain/companion";

const PRESETS = [
  "https://picsum.photos/seed/pehchan-foxglove/900/1200",
  "https://picsum.photos/seed/pehchan-harbor/900/1200",
  "https://picsum.photos/seed/pehchan-ember/900/1200",
  "https://picsum.photos/seed/pehchan-static/900/1200",
];

const inputClass = "w-full";

type CompanionFormProps = {
  action: (state: CompanionActionState, formData: FormData) => Promise<CompanionActionState>;
  initialState: CompanionActionState;
  categories: Category[];
  mode: "create" | "edit";
  companion?: {
    id: string;
    name: string;
    tagline: string;
    description: string;
    categoryId: string;
    imageUrl: string;
    greeting: string;
    instructions: string;
    examples: CompanionExample[];
    visibility: "public" | "private";
  };
};

export function CompanionForm({
  action,
  initialState,
  categories,
  mode,
  companion,
}: CompanionFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [imageUrl, setImageUrl] = useState(companion?.imageUrl ?? PRESETS[0] ?? "");
  const [examples, setExamples] = useState(companion ? serializeExamples(companion.examples) : "");

  const errors = state.errors ?? {};
  const errorFor = (field: keyof typeof errors) => errors[field]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {companion ? <input type="hidden" name="id" value={companion.id} /> : null}

      {state.status === "error" ? (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.message ?? "Something needs another look."}
        </p>
      ) : null}

      <section className="paper-card rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">Identity</p>
        <h2 className="display mt-2 text-3xl">Who are they?</h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <TextField
            name="name"
            isRequired
            defaultValue={companion?.name}
            isInvalid={Boolean(errorFor("name"))}
          >
            <Label>Name</Label>
            <Input className={inputClass} placeholder="Aria Vale" />
            {errorFor("name") ? <FieldError>{errorFor("name")}</FieldError> : null}
          </TextField>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="categoryId" className="text-sm font-medium">
              Category
            </label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={companion?.categoryId ?? categories[0]?.id}
              className="h-10 rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:border-line-strong"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errorFor("categoryId") ? (
              <p className="text-xs text-danger">{errorFor("categoryId")}</p>
            ) : null}
          </div>
        </div>

        <TextField
          name="tagline"
          className="mt-5"
          isRequired
          defaultValue={companion?.tagline}
          isInvalid={Boolean(errorFor("tagline"))}
        >
          <Label>Tagline</Label>
          <Input
            className={inputClass}
            placeholder="Late-night radio host who remembers the songs you needed."
          />
          {errorFor("tagline") ? (
            <FieldError>{errorFor("tagline")}</FieldError>
          ) : (
            <Description>One line that sets the tone. Max 120 characters.</Description>
          )}
        </TextField>

        <TextField
          name="description"
          className="mt-5"
          isRequired
          defaultValue={companion?.description}
          isInvalid={Boolean(errorFor("description"))}
        >
          <Label>Description</Label>
          <TextArea
            className={inputClass}
            rows={4}
            placeholder="A short biography, written like the narrator already knows them."
          />
          {errorFor("description") ? (
            <FieldError>{errorFor("description")}</FieldError>
          ) : (
            <Description>What makes them specific. Max 2,000 characters.</Description>
          )}
        </TextField>
      </section>

      <section className="paper-card rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">Voice</p>
        <h2 className="display mt-2 text-3xl">How do they speak?</h2>

        <TextField
          name="instructions"
          className="mt-6"
          isRequired
          defaultValue={companion?.instructions}
          isInvalid={Boolean(errorFor("instructions"))}
        >
          <Label>Behaviour and voice</Label>
          <TextArea
            className={inputClass}
            rows={6}
            placeholder="Speak in short, grounded sentences. Ask one good follow-up question. Never rush to advice."
          />
          {errorFor("instructions") ? (
            <FieldError>{errorFor("instructions")}</FieldError>
          ) : (
            <Description>
              Tone, rhythm, boundaries, and what they should avoid. This becomes the system prompt.
            </Description>
          )}
        </TextField>

        <TextField
          name="greeting"
          className="mt-5"
          isRequired
          defaultValue={companion?.greeting}
          isInvalid={Boolean(errorFor("greeting"))}
        >
          <Label>Opening line</Label>
          <TextArea
            className={inputClass}
            rows={2}
            placeholder="You caught me between tracks. The kettle is on. What is keeping you up?"
          />
          {errorFor("greeting") ? (
            <FieldError>{errorFor("greeting")}</FieldError>
          ) : (
            <Description>The first thing you see on the chat screen.</Description>
          )}
        </TextField>

        <div className="mt-5 flex flex-col gap-1.5">
          <label htmlFor="examples" className="text-sm font-medium">
            Example dialogue
          </label>
          <textarea
            id="examples"
            name="examples"
            rows={4}
            value={examples}
            onChange={(event) => setExamples(event.target.value)}
            placeholder={
              "I keep replaying a conversation from work. | The kind that gets louder every time you replay it?\nI think I'm just tired. | Tired has a lot of disguises."
            }
            className="resize-y rounded-xl border border-line bg-paper px-3 py-2.5 font-mono text-xs leading-6 outline-none focus:border-line-strong"
          />
          <p className="text-xs text-muted">
            One exchange per line: user line | companion line. Up to 4.
          </p>
          {errorFor("examples") ? (
            <p className="text-xs text-danger">{errorFor("examples")}</p>
          ) : null}
        </div>
      </section>

      <section className="paper-card rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">Face</p>
        <h2 className="display mt-2 text-3xl">What do they look like?</h2>

        <div className="mt-6 grid gap-6 sm:grid-cols-[10rem_1fr]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-line bg-surface">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt="Companion preview"
                fill
                sizes="160px"
                className="object-cover"
              />
            ) : null}
          </div>

          <div>
            <TextField
              name="imageUrl"
              isRequired
              value={imageUrl}
              onChange={setImageUrl}
              isInvalid={Boolean(errorFor("imageUrl"))}
            >
              <Label>Image URL</Label>
              <Input className={inputClass} placeholder="https://…" />
              {errorFor("imageUrl") ? (
                <FieldError>{errorFor("imageUrl")}</FieldError>
              ) : (
                <Description>Use a portrait crop, at least 800px tall.</Description>
              )}
            </TextField>

            <div className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((preset, index) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setImageUrl(preset)}
                  className={`h-14 w-11 overflow-hidden rounded-lg border transition-all ${
                    imageUrl === preset ? "border-accent ring-2 ring-accent/30" : "border-line"
                  }`}
                  aria-label={`Use preset portrait ${index + 1}`}
                >
                  <Image
                    src={preset}
                    alt=""
                    width={44}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 max-w-xs">
          <label htmlFor="visibility" className="text-sm font-medium">
            Visibility
          </label>
          <select
            id="visibility"
            name="visibility"
            defaultValue={companion?.visibility ?? "public"}
            className="mt-1.5 h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:border-line-strong"
          >
            <option value="public">Public, listed in the catalogue</option>
            <option value="private">Private, only visible to you</option>
          </select>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" isDisabled={isPending} className="rounded-full px-6">
          {isPending ? "Saving…" : mode === "create" ? "Create companion" : "Save changes"}
        </Button>
        <Link
          href="/studio"
          className="text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
