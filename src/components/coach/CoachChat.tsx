"use client";

import ChatInput from "./ChatInput";
import CoachStatusBar from "./CoachStatusBar";
import ContextPeek from "./ContextPeek";
import MessageList from "./MessageList";
import QuickPrompts from "./QuickPrompts";
import { useCoachChat } from "./useCoachChat";

/** The coach screen: status, what the coach sees, starter questions, the conversation and the input. */
export default function CoachChat() {
  const chat = useCoachChat();
  return (
    <div className="space-y-4">
      <CoachStatusBar
        health={chat.health}
        canClear={chat.messages.length > 0}
        onRefresh={() => void chat.refreshHealth()}
        onClear={() => void chat.clear()}
      />
      <ContextPeek text={chat.context} />
      {chat.messages.length === 0 && <QuickPrompts disabled={chat.busy} onAsk={(q) => void chat.ask(q)} />}
      <MessageList messages={chat.messages} />
      <ChatInput busy={chat.busy} onSend={(q) => void chat.ask(q)} onStop={chat.stop} />
    </div>
  );
}
