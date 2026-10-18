"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { btnPrimary, btnSecondary, input } from "@/lib/ui";

/** Question box pinned above the tab bar; becomes a Stop button while the coach is writing. */
export default function ChatInput({ busy, onSend, onStop }: { busy: boolean; onSend: (text: string) => void; onStop: () => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="sticky bottom-20 flex gap-2 bg-ink py-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim() || busy) return;
        onSend(text.trim());
        setText("");
      }}
    >
      <input className={input} placeholder="Ask your coach…" value={text} onChange={(e) => setText(e.target.value)} />
      {busy ? (
        <button type="button" className={btnSecondary} onClick={onStop}>
          Stop
        </button>
      ) : (
        <button className={btnPrimary} aria-label="Send" disabled={!text.trim()}>
          <Send size={18} />
        </button>
      )}
    </form>
  );
}
