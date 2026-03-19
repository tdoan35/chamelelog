import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
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
  });

  if (!changelog) {
    return NextResponse.json(
      { error: "Changelog not found" },
      { status: 404 },
    );
  }

  const updated = await db.changelog.update({
    where: { id },
    data: {
      status: "published",
      publishedAt: new Date(),
    },
  });

  return NextResponse.json({ data: updated });
}
