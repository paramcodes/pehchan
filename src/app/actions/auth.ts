"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";

const credentialsSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});

function safeNext(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/studio";
  if (!value.startsWith("/") || value.startsWith("//")) return "/studio";
  return value;
}

function withError(path: string, message: string, next: string): string {
  const params = new URLSearchParams({ error: message });
  if (next !== "/studio") params.set("next", next);
  return `${path}?${params.toString()}`;
}

export async function signUpAction(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const parsed = credentialsSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(withError("/sign-up", "Use a name, a valid email, and at least 8 characters.", next));
  }

  try {
    await auth.api.signUpEmail({
      body: {
        name: parsed.data.name ?? parsed.data.email.split("@")[0] ?? "Reader",
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: await headers(),
    });
  } catch (error) {
    console.error("Sign up failed.", error);
    redirect(withError("/sign-up", "That email may already be in use.", next));
  }

  redirect(next);
}

export async function signInAction(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(withError("/sign-in", "Enter a valid email and password.", next));
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: await headers(),
    });
  } catch (error) {
    console.error("Sign in failed.", error);
    redirect(withError("/sign-in", "Email or password is incorrect.", next));
  }

  redirect(next);
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
