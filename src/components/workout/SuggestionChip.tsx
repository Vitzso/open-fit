import { TrendingUp } from "lucide-react";
import type { Suggestion } from "@/lib/progression";

/** "Last time you hit all your reps… Try 85 kg." Tap to fill in the form. */
export default function SuggestionChip({ suggestion, onUse }: { suggestion: Suggestion; onUse: () => void }) {
  const up = suggestion.kind === "increase";
  return (
    <button
      type="button"
      onClick={onUse}
      className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-[15px] ${up ? "bg-plate-green/15 text-fg" : "bg-raised text-fg"}`}
    >
      <TrendingUp size={18} className={`mt-0.5 shrink-0 ${up ? "text-plate-green" : "text-muted"}`} />
      <span>
        {suggestion.message} <span className="text-muted">Tap to use it.</span>
      </span>
    </button>
  );
}
