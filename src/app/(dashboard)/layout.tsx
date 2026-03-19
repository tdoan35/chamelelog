import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { KeyboardShortcutsProvider } from "@/components/dashboard/keyboard-shortcuts-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <KeyboardShortcutsProvider />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-6 pb-8">{children}</div>
      </main>
    </div>
  );
}
