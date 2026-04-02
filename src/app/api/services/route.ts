import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { checkFamilyServices, groupFamilyServices } from "@/lib/dashboard/health";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const services = await checkFamilyServices();
  const grouped = groupFamilyServices(services);

  return NextResponse.json({
    services: grouped,
    timestamp: new Date().toISOString(),
  });
}
