import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getCurrentUser, getGitHubToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { Octokit } from "octokit";

const CreateProjectSchema = z.object({
  repoOwner: z.string().min(1),
  repoName: z.string().min(1),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: projects });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { repoOwner, repoName } = parsed.data;

  // Verify the repo exists and is accessible
  const token = await getGitHubToken(user.id);
  if (!token) {
    return NextResponse.json(
      { error: "No GitHub token found. Please re-authenticate." },
      { status: 401 }
    );
  }

  try {
    const octokit = new Octokit({ auth: token });
    await octokit.rest.repos.get({ owner: repoOwner, repo: repoName });
  } catch {
    return NextResponse.json(
      { error: `Repository ${repoOwner}/${repoName} not found or not accessible` },
      { status: 404 }
    );
  }

  // Check if already connected
  const existing = await db.project.findUnique({
    where: {
      userId_repoOwner_repoName: {
        userId: user.id,
        repoOwner,
        repoName,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ data: existing });
  }

  const project = await db.project.create({
    data: {
      userId: user.id,
      repoOwner,
      repoName,
      repoUrl: `https://github.com/${repoOwner}/${repoName}`,
    },
  });

  return NextResponse.json({ data: project }, { status: 201 });
}
