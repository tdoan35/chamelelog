import { z } from "zod";
import { getCurrentUser, getGitHubToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { runPipeline, type PipelineEvent } from "@/lib/ai/pipeline";
import { contentToJson } from "@/lib/markdown";

const GenerateRequestSchema = z.object({
  projectId: z.string(),
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
  fromRef: z.string().optional(),
  toRef: z.string().optional(),
  tone: z.enum(["technical", "product", "enterprise"]).default("technical"),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  let body;
  try {
    body = GenerateRequestSchema.parse(await req.json());
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        details: err instanceof z.ZodError ? err.issues : undefined,
      }),
      { status: 400 },
    );
  }

  // Verify the project belongs to this user
  const project = await db.project.findFirst({
    where: { id: body.projectId, userId: user.id },
  });

  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404,
    });
  }

  // Get GitHub token
  const accessToken = await getGitHubToken(user.id);
  if (!accessToken) {
    return new Response(
      JSON.stringify({ error: "GitHub token not found. Please reconnect your account." }),
      { status: 401 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const result = await runPipeline(
          {
            accessToken,
            repoOwner: project.repoOwner,
            repoName: project.repoName,
            fromDate: body.fromDate,
            toDate: body.toDate,
            tone: body.tone,
          },
          (event: PipelineEvent) => {
            switch (event.type) {
              case "status":
                send("status", {
                  stage: event.stage,
                  message: event.message,
                });
                break;
              case "entry":
                send("entry", event.entry);
                break;
              // complete and error are handled below
            }
          },
        );

        if (!result) {
          send("complete", {
            changelogId: null,
            commitCount: 0,
            filteredCount: 0,
          });
          return;
        }

        // Save changelog to database
        const title = `Changelog ${new Date(body.fromDate).toLocaleDateString()} – ${new Date(body.toDate).toLocaleDateString()}`;

        const changelog = await db.changelog.create({
          data: {
            projectId: body.projectId,
            userId: user.id,
            title,
            content: JSON.stringify(contentToJson(result.categories)),
            rawContent: result.rawMarkdown,
            classificationData: JSON.stringify(result.classificationData),
            status: "draft",
            fromDate: new Date(body.fromDate),
            toDate: new Date(body.toDate),
            fromRef: body.fromRef,
            toRef: body.toRef,
            commitCount: result.commitCount,
          },
        });

        send("complete", {
          changelogId: changelog.id,
          commitCount: result.commitCount,
          filteredCount: result.filteredCount,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unexpected error occurred";

        // Surface common GitHub API errors
        if (message.includes("rate limit")) {
          send("error", { message: "GitHub API rate limit exceeded. Please try again later." });
        } else if (message.includes("Not Found")) {
          send("error", { message: "Repository not found. Check that your token has access." });
        } else {
          send("error", { message });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
