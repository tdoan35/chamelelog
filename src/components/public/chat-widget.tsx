"use client";

import { useState, useRef, useEffect, type FormEvent, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { MessageCircle, X, Send, Loader2, ArrowDown } from "lucide-react";

/** Lightweight inline markdown: **bold**, *italic*, `code` */
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2]) parts.push(<strong key={key++} className="font-semibold">{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={key++}>{match[3]}</em>);
    else if (match[4]) parts.push(<code key={key++} className="rounded bg-white/10 px-1 py-0.5 text-[12px]">{match[4]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Render markdown text with bold, italic, code, bullets, and headings */
function renderMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();

    if (trimmed.startsWith("### ")) {
      elements.push(<p key={key++} className="mt-2 mb-1 font-semibold">{renderInline(trimmed.slice(4))}</p>);
    } else if (trimmed.startsWith("## ")) {
      elements.push(<p key={key++} className="mt-2 mb-1 font-semibold">{renderInline(trimmed.slice(3))}</p>);
    } else if (trimmed.startsWith("# ")) {
      elements.push(<p key={key++} className="mt-2 mb-1 font-semibold">{renderInline(trimmed.slice(2))}</p>);
    } else if (/^[*-]\s/.test(trimmed)) {
      elements.push(
        <div key={key++} className="flex gap-1.5 pl-1">
          <span className="shrink-0 select-none text-text-tertiary">&bull;</span>
          <span>{renderInline(trimmed.replace(/^[*-]\s/, ""))}</span>
        </div>
      );
    } else if (trimmed === "") {
      elements.push(<div key={key++} className="h-1.5" />);
    } else {
      elements.push(<p key={key++}>{renderInline(line)}</p>);
    }
  }

  return <div className="flex flex-col gap-0.5">{elements}</div>;
}

interface ChatWidgetProps {
  username?: string;
}

export function ChatWidget({ username }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);     // drives CSS transition state
  const [visible, setVisible] = useState(false); // controls DOM mount
  const [input, setInput] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status } = useChat();

  const isLoading = status === "streaming" || status === "submitted";

  const handleOpen = () => {
    setVisible(true);  // mount the panel
    // defer open to next frame so the "from" styles are painted first
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOpen(true);
      });
    });
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (open && visible) inputRef.current?.focus();
  }, [open, visible]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(distanceFromBottom > 80);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() }, { body: { username } });
    setInput("");
  };

  return (
    <>
      {/* FAB button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full px-[18px] py-3 text-[13px] font-medium text-white transition-[box-shadow,brightness,opacity,transform] duration-300 hover:brightness-110"
        style={{
          background: "linear-gradient(135deg, #10B981, #3B82F6)",
          boxShadow: "0 0 24px 6px #10B98140",
          opacity: open ? 0 : 1,
          transform: open ? "scale(0.8)" : "scale(1)",
          pointerEvents: open ? "none" : "auto",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 28px 8px #10B98158")}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 24px 6px #10B98140")}
      >
        <MessageCircle className="h-4 w-4" />
        Ask about changes
      </button>

      {/* Chat panel */}
      {visible && (
        <div
          className="fixed bottom-6 right-6 z-50 flex h-[480px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border-primary shadow-2xl transition-[opacity,transform] duration-300 ease-out"
          style={{
            backgroundColor: "var(--surface, #0D0D0D)",
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
            transformOrigin: "bottom right",
          }}
          onTransitionEnd={() => {
            if (!open) setVisible(false);
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              background: "linear-gradient(135deg, #10B98120, #3B82F620)",
              borderBottom: "1px solid var(--border-primary, #1A1A1A)",
            }}
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-[13px] font-semibold text-text-primary">
                Ask about changes
              </span>
            </div>
            <button
              onClick={handleClose}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="relative flex-1 overflow-y-auto px-4 py-3" ref={messagesContainerRef} onScroll={handleScroll}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="h-8 w-8 text-text-tertiary" />
                <p className="mt-3 text-[13px] text-text-secondary">
                  Ask anything about recent changes
                </p>
                <p className="mt-1 text-[11px] text-text-tertiary">
                  e.g. &quot;What changed in the last release?&quot;
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {messages.map((message) => {
                const text =
                  message.parts
                    ?.filter((p) => p.type === "text")
                    .map((p) => p.text)
                    .join("") ?? "";
                if (!text) return null;
                return (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        message.role === "user"
                          ? "rounded-br-md bg-accent text-accent-text"
                          : "rounded-bl-md border border-border-primary bg-surface text-text-primary"
                      }`}
                    >
                      {message.role === "assistant" ? renderMarkdown(text) : text}
                    </div>
                  </div>
                );
              })}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-border-primary bg-surface px-3.5 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
                  </div>
                </div>
              )}
            </div>

            <div ref={messagesEndRef} />

            {showScrollDown && (
              <button
                onClick={scrollToBottom}
                className="sticky bottom-1 left-full -mr-1 ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-border-primary bg-surface shadow-md transition-colors hover:bg-surface-hover"
              >
                <ArrowDown className="h-3.5 w-3.5 text-text-secondary" />
              </button>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-border-primary px-3 py-2.5"
            style={{ backgroundColor: "var(--surface, #0D0D0D)" }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about changes..."
              className="min-w-0 flex-1 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:text-accent disabled:opacity-30"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
