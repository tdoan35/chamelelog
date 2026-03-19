import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { LinkedAccountCard } from "@/components/dashboard/settings/linked-account-card";
import { ConnectedReposCard } from "@/components/dashboard/settings/connected-repos-card";
import { PreferencesCard } from "@/components/dashboard/settings/preferences-card";
import { DangerZoneCard } from "@/components/dashboard/settings/danger-zone-card";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/");
  }

  const [projects, preferences] = await Promise.all([
    db.project.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    db.userPreferences.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8 pt-8 pb-10">
      <h1 className="font-display text-2xl font-bold text-text-primary">
        Settings
      </h1>

      <LinkedAccountCard user={session.user} />
      <ConnectedReposCard projects={projects} />
      <PreferencesCard preferences={preferences} />
      <DangerZoneCard projects={projects} />
    </div>
  );
}
