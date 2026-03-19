import { NextResponse } from "next/server";
import { getCurrentUser, getGitHubToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { createGitHubClient } from "@/lib/github/client";
import { getRecentTags } from "@/lib/github/tags";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, userId: user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const token = await getGitHubToken(user.id);
  if (!token) {
    return NextResponse.json(
      { error: "No GitHub token found. Please re-authenticate." },
      { status: 401 },
    );
  }

  const octokit = createGitHubClient(token);
  const tags = await getRecentTags(
    octokit,
    project.repoOwner,
    project.repoName,
  );

  return NextResponse.json({ data: tags });
}
