import { auth, Session } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function getSession(): Promise<Session | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(
  allowedRoles: string[]
): Promise<Session> {
  const session = await requireSession();
  const userRole = (session.user as { role?: string }).role || "member";
  if (!allowedRoles.includes(userRole)) {
    redirect("/");
  }
  return session;
}
