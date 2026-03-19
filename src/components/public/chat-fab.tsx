"use client";

import { MessageCircle } from "lucide-react";

export function ChatFab() {
  return (
    <button
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full px-[18px] py-3 text-[13px] font-medium text-[#022C22]"
      style={{
        background: "linear-gradient(135deg, #10B981, #3B82F6)",
        boxShadow: "0 0 24px 6px #10B98140",
      }}
    >
      <MessageCircle className="h-4 w-4" />
      Ask about changes
    </button>
  );
}
