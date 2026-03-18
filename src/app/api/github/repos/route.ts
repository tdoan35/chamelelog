import { NextResponse } from "next/server";
import { getCurrentUser, getGitHubToken } from "@/lib/auth";
import { Octokit } from "octokit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getGitHubToken(user.id);
  if (!token) {
    return NextResponse.json(
      { error: "No GitHub token found" },
      { status: 401 }
    );
  }

  try {
    const octokit = new Octokit({ auth: token });
    const repos = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
      type: "all",
    });

    const data = repos.data.map((repo) => ({
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      updatedAt: repo.updated_at,
    }));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
