import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LandingContent } from "@/components/landing-content";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect("/changelogs");
  }

  return <LandingContent />;
}
