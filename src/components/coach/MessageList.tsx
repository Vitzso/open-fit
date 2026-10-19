"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Bot, LoaderCircle, Utensils } from "lucide-react";
import Markdown from "@/components/Markdown";
import { describesEating, logFoodHref, suggestsMeal } from "@/lib/food-ai/detect";
import type { ChatMsg } from "./useCoachChat";

/** Bubble colours: your messages, coach replies, and errors. */
function bubbleClass(m: ChatMsg): string {
  if (m.role === "user") return "bg-plate-white whitespace-pre-wrap text-ink";
  if (m.error) return "border border-red-500/30 bg-red-500/10 whitespace-pre-wrap text-red-200";
  return "bg-surface text-fg";
}

/** One message: a spinner while empty, Markdown for coach replies, plain text otherwise. */
function Bubble({ m, done }: { m: ChatMsg; done: boolean }) {
  // "Log as food": your message about a meal, or a coach reply that suggests one with numbers.
  const offerLog = done && !m.error && !!m.content && (m.role === "user" ? describesEating(m.content) : suggestsMeal(m.content));
  return (
    <li className={m.role === "user" ? "flex flex-col items-end" : "flex gap-2"}>
      {m.role === "assistant" && <Bot size={20} className="mt-1 shrink-0 text-plate-red" />}
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${bubbleClass(m)}`}>
        {!m.content ? (
          <LoaderCircle size={16} className="animate-spin text-muted" />
        ) : m.role === "assistant" && !m.error ? (
          <Markdown text={m.content} />
        ) : (
          m.content
        )}
        {offerLog && m.role === "assistant" && <LogLink text={m.content} label="Log this meal" />}
      </div>
      {offerLog && m.role === "user" && <LogLink text={m.content} label="Log as food" />}
    </li>
  );
}

/** Opens Add food with the AI card filled in from this message (you check it before saving). */
function LogLink({ text, label }: { text: string; label: string }) {
  return (
    <Link href={logFoodHref(text)} className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-plate-green underline-offset-2 active:opacity-60">
      <Utensils size={13} /> {label}
    </Link>
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
        {messages.map((m, i) => (
          // A reply that's still streaming in gets its link once it's finished (the next message exists, or it's the last one and not empty).
          <Bubble key={m.id} m={m} done={i < messages.length - 1 || m.role === "user" || !!m.content} />
        ))}
      </ul>
      <div ref={bottomRef} />
    </>
  );
}
