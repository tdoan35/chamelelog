"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
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

interface DangerZoneCardProps {
  projects: Project[];
}

export function DangerZoneCard({ projects }: DangerZoneCardProps) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const expectedText = deleteProject
    ? `${deleteProject.repoOwner}/${deleteProject.repoName}`
    : "";

  const handleDelete = async () => {
    if (!deleteProject || confirmText !== expectedText) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${deleteProject.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const name = `${deleteProject.repoOwner}/${deleteProject.repoName}`;
        setDeleteProject(null);
        setConfirmText("");
        setSelectedProjectId("");
        router.push("/changelogs");
        router.refresh();
        toast.success(`Deleted project ${name}`);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-base font-semibold text-red-500">
        Danger Zone
      </h2>
      <div className="rounded-lg border border-red-500 bg-red-50 p-5 dark:bg-red-950/20">
        {projects.length === 0 ? (
          <p className="text-sm text-text-tertiary">No projects to delete.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-primary">
                Delete a project
              </span>
              <span className="text-[13px] text-text-secondary">
                Once you delete a project, there is no going back. All
                changelogs will be permanently removed.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="flex-1 rounded-md border border-border-primary bg-surface px-3 py-2 font-mono text-sm text-text-primary focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="">Select a project…</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.repoOwner}/{project.repoName}
                  </option>
                ))}
              </select>
              <button
                disabled={!selectedProjectId}
                onClick={() => {
                  const project = projects.find(
                    (p) => p.id === selectedProjectId,
                  );
                  if (project) {
                    setDeleteProject(project);
                    setConfirmText("");
                  }
                }}
                className="flex shrink-0 items-center gap-1.5 rounded-md bg-red-500 px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete project
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={!!deleteProject}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteProject(null);
            setConfirmText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-mono font-medium text-text-primary">
                {expectedText}
              </span>{" "}
              and all its changelogs. Type{" "}
              <span className="font-mono font-medium text-text-primary">
                {expectedText}
              </span>{" "}
              to confirm.
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expectedText}
            className="w-full rounded-md border border-border-primary bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteProject(null);
                setConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== expectedText || deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
