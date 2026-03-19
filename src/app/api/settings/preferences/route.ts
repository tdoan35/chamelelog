import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const PreferencesSchema = z.object({
  defaultTone: z.enum(["technical", "product", "enterprise"]),
  defaultDateRange: z.enum(["last-release", "7-days", "14-days", "30-days"]),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await db.userPreferences.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
    data: preferences ?? { defaultTone: "technical", defaultDateRange: "last-release" },
  });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = PreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const preferences = await db.userPreferences.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ data: preferences });
}
