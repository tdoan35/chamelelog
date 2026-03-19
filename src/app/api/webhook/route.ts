import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getGitHubToken } from "@/lib/auth";
import { getRecentTags } from "@/lib/github/tags";
import { createGitHubClient } from "@/lib/github/client";
import { runPipeline } from "@/lib/ai/pipeline";
import { contentToJson } from "@/lib/markdown";

function verifySignature(
  payload: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

export async function POST(req: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const payload = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifySignature(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  if (event !== "create") {
    return NextResponse.json({ ok: true, skipped: "not a create event" });
  }

  const body = JSON.parse(payload);

  // Only handle tag creation
  if (body.ref_type !== "tag") {
    return NextResponse.json({ ok: true, skipped: "not a tag" });
  }

  const repoOwner = body.repository?.owner?.login;
  const repoName = body.repository?.name;
  const tagName = body.ref;

  if (!repoOwner || !repoName) {
    return NextResponse.json({ error: "Missing repository info" }, { status: 400 });
  }

  // Look up project
  const project = await db.project.findFirst({
    where: { repoOwner, repoName },
  });

  if (!project) {
    return NextResponse.json({ ok: true, skipped: "no matching project" });
  }

  // Get GitHub token for the project owner
  const accessToken = await getGitHubToken(project.userId);
  if (!accessToken) {
    return NextResponse.json(
      { error: "No GitHub token for project owner" },
      { status: 500 },
    );
  }

  // Determine date range from previous tag
  const octokit = createGitHubClient(accessToken);
  const tags = await getRecentTags(octokit, repoOwner, repoName, 5);

  // Find the previous tag (the one before the newly created tag)
  const currentTagIdx = tags.findIndex((t) => t.name === tagName);
  const previousTag = currentTagIdx >= 0 ? tags[currentTagIdx + 1] : tags[0];

  const toDate = new Date().toISOString();
  const fromDate = previousTag?.date ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Run pipeline (non-streaming)
  let result;
  try {
    result = await runPipeline(
      {
        accessToken,
        repoOwner,
        repoName,
        fromDate,
        toDate,
        tone: "technical",
      },
      () => {}, // no-op event handler
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Pipeline failed" },
      { status: 500 },
    );
  }

  if (!result) {
    return NextResponse.json({ ok: true, skipped: "no meaningful commits" });
  }

  // Save as pending_review draft
  const title = `Release ${tagName}`;
  const changelog = await db.changelog.create({
    data: {
      projectId: project.id,
      userId: project.userId,
      title,
      content: JSON.stringify(contentToJson(result.categories)),
      rawContent: result.rawMarkdown,
      classificationData: JSON.stringify(result.classificationData),
      status: "pending_review",
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      fromRef: previousTag?.name ?? undefined,
      toRef: tagName,
      commitCount: result.commitCount,
      version: tagName,
    },
  });

  return NextResponse.json({
    ok: true,
    changelogId: changelog.id,
    commitCount: result.commitCount,
  });
}
