"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  repoOwner: string;
  repoName: string;
}

interface ConnectedReposCardProps {
  projects: Project[];
}

export function ConnectedReposCard({ projects }: ConnectedReposCardProps) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [confirmProject, setConfirmProject] = useState<Project | null>(null);

  const handleDisconnect = async (project: Project) => {
    setDisconnecting(project.id);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConfirmProject(null);
        router.refresh();
      }
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-base font-semibold text-text-primary">
        Connected Repository
      </h2>
      <div className="rounded-lg border border-border-primary bg-surface p-5">
        {projects.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            No repositories connected yet.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <GitBranch className="h-5 w-5 text-emerald-500" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-text-primary">
                      {project.repoOwner}/{project.repoName}
                    </span>
                    <span className="text-xs text-[#6B6B6B]">Connected</span>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmProject(project)}
                  className="rounded-md border border-border-primary px-4 py-2 text-[13px] font-medium text-red-500 transition-colors hover:bg-surface-hover"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!confirmProject} onOpenChange={(open) => !open && setConfirmProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect repository</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect{" "}
              <span className="font-mono font-medium text-text-primary">
                {confirmProject?.repoOwner}/{confirmProject?.repoName}
              </span>
              ? All associated changelogs will be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmProject(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={disconnecting === confirmProject?.id}
              onClick={() => confirmProject && handleDisconnect(confirmProject)}
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
