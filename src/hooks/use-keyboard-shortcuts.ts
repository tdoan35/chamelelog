"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "n") {
        e.preventDefault();
        router.push("/changelogs/new");
      }

      if (mod && e.key === "Enter") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("changelog:submit"));
      }

      if (mod && e.shiftKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("changelog:publish"));
      }

      if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("dialog:close"));
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);
}
