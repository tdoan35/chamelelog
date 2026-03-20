import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProjectSidebar } from "@/components/public/project-sidebar";
import { ChatWidget } from "@/components/public/chat-widget";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return {
    alternates: {
      types: {
        "application/rss+xml": `/api/feed/rss?user=${username}`,
        "application/feed+json": `/api/feed/json?user=${username}`,
      },
    },
  };
}

export default async function UserChangelogLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const user = await db.user.findUnique({ where: { username } });
  if (!user) notFound();

  const projects = await db.project.findMany({
    where: {
      userId: user.id,
      changelogs: { some: { status: "published" } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, repoOwner: true, repoName: true, repoUrl: true },
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense>
        <ProjectSidebar projects={projects} username={username} />
      </Suspense>
      <main className="flex-1 overflow-auto">{children}</main>
      <ChatWidget username={username} />
    </div>
  );
}
