import { Suspense } from "react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ProjectSidebar } from "@/components/public/project-sidebar";
import { ChatWidget } from "@/components/public/chat-widget";

export const metadata: Metadata = {
  alternates: {
    types: {
      "application/rss+xml": "/api/feed/rss",
      "application/feed+json": "/api/feed/json",
    },
  },
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const projects = await db.project.findMany({
    where: { changelogs: { some: { status: "published" } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, repoOwner: true, repoName: true, repoUrl: true },
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense>
        <ProjectSidebar projects={projects} />
      </Suspense>
      <main className="flex-1 overflow-auto">{children}</main>
      <ChatWidget />
    </div>
  );
}
