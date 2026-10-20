import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

export async function requireUserForAction(nextPath: string) {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  return session;
}

export type AppSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;
