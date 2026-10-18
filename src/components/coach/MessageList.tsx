"use client";

import { useEffect, useRef } from "react";
import { Bot, LoaderCircle } from "lucide-react";
import Markdown from "@/components/Markdown";
import type { ChatMsg } from "./useCoachChat";

/** Bubble colours: your messages, coach replies, and errors. */
function bubbleClass(m: ChatMsg): string {
  if (m.role === "user") return "bg-plate-white whitespace-pre-wrap text-ink";
  if (m.error) return "border border-red-500/30 bg-red-500/10 whitespace-pre-wrap text-red-200";
  return "bg-surface text-fg";
}

/** One message: a spinner while empty, Markdown for coach replies, plain text otherwise. */
function Bubble({ m }: { m: ChatMsg }) {
  return (
    <li className={m.role === "user" ? "flex justify-end" : "flex gap-2"}>
      {m.role === "assistant" && <Bot size={20} className="mt-1 shrink-0 text-plate-red" />}
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${bubbleClass(m)}`}>
        {!m.content ? (
          <LoaderCircle size={16} className="animate-spin text-muted" />
        ) : m.role === "assistant" && !m.error ? (
          <Markdown text={m.content} />
        ) : (
          m.content
        )}
      </div>
    </li>
  );
}

/** The conversation, scrolled to the newest message. */
export default function MessageList({ messages }: { messages: ChatMsg[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  return (
    <>
      <ul className="space-y-3">
        {messages.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
      </ul>
      <div ref={bottomRef} />
    </>
  );
}
