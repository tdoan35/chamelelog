import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const PatchSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  rawContent: z.string().optional(),
  version: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const changelog = await db.changelog.findFirst({
    where: { id, userId: user.id },
    include: { project: true },
  });

  if (!changelog) {
    return NextResponse.json(
      { error: "Changelog not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: changelog });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const changelog = await db.changelog.findFirst({
    where: { id, userId: user.id },
  });

  if (!changelog) {
    return NextResponse.json(
      { error: "Changelog not found" },
      { status: 404 },
    );
  }

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updated = await db.changelog.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ data: updated });
}
