import { Sparkles } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/lib/ui";

const QUICK = [
  "Weekly review: what should I change next week?",
  "Am I eating enough protein to keep my muscle?",
  "Should I adjust my calorie target based on my weight trend?",
  "Which lifts are progressing or stalling?",
];

/** Starter questions shown before the first message. An empty question means "review my week". */
export default function QuickPrompts({ disabled, onAsk }: { disabled: boolean; onAsk: (q: string) => void }) {
  return (
    <div className="space-y-2">
      <button className={`${btnPrimary} w-full`} disabled={disabled} onClick={() => onAsk("")}>
        <Sparkles size={18} /> Review my week
      </button>
      {QUICK.map((q) => (
        <button key={q} className={`${btnSecondary} w-full justify-start text-left text-sm`} onClick={() => onAsk(q)}>
          {q}
        </button>
      ))}
    </div>
  );
}
