import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false, error: "No token provided" });
  }

  const invite = await prisma.inviteToken.findUnique({
    where: { token },
  });

  if (!invite) {
    return NextResponse.json({ valid: false, error: "Invalid invite token" });
  }

  if (invite.usedAt) {
    return NextResponse.json({ valid: false, error: "Invite already used" });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: "Invite expired" });
  }

  return NextResponse.json({ valid: true, email: invite.email, role: invite.role });
}
