import Link from "next/link";
import { redirect } from "next/navigation";
import { signInAction } from "@/app/actions/auth";
import { Button, Input, Label, TextField } from "@heroui/react";
import { getSession } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  if (session) redirect(params.next ?? "/studio");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-5 py-16 sm:py-24">
      <p className="eyebrow">Return visit</p>
      <h1 className="display mt-3 text-5xl">Welcome back.</h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        Pick up a conversation, or start one with someone new.
      </p>

      {params.error ? (
        <p className="mt-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {params.error}
        </p>
      ) : null}

      <form action={signInAction} className="mt-8 flex flex-col gap-5">
        <input type="hidden" name="next" value={params.next ?? "/studio"} />
        <TextField name="email" type="email" isRequired>
          <Label>Email</Label>
          <Input placeholder="you@example.com" autoComplete="email" />
        </TextField>
        <TextField name="password" type="password" isRequired>
          <Label>Password</Label>
          <Input placeholder="At least 8 characters" autoComplete="current-password" />
        </TextField>
        <Button type="submit" className="mt-2 w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted">
        New here?{" "}
        <Link href="/sign-up" className="font-medium text-ink underline underline-offset-4">
          Make an account
        </Link>
        .
      </p>
    </div>
  );
}
