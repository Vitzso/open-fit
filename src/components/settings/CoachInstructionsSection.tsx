import { COACH_INSTRUCTIONS_MAX } from "@/lib/coach/instructions";
import type { AppSettings } from "@/lib/settings";
import { card, input, label } from "@/lib/ui";

/** Free-text instructions added to every coach request (tone, focus, diet, equipment…). */
export default function CoachInstructionsSection({ s }: { s: AppSettings }) {
  return (
    <section className={`${card} space-y-3`}>
      <h2 className="font-display text-xl font-semibold">Coach instructions</h2>
      <div>
        <label htmlFor="coachInstructions" className={label}>
          Tell the coach how to help you
        </label>
        <textarea
          id="coachInstructions"
          name="coachInstructions"
          rows={5}
          maxLength={COACH_INSTRUCTIONS_MAX}
          defaultValue={s.coachInstructions ?? ""}
          placeholder={"e.g. I'm vegetarian. I train at home with dumbbells up to 25 kg. Keep answers short and skip the pep talk."}
          className={`${input} h-auto py-3 leading-relaxed`}
        />
      </div>
      <p className="text-sm text-muted">
        Used in every chat and daily note. Up to {COACH_INSTRUCTIONS_MAX} characters. The coach&apos;s safety rules always come first.
      </p>
    </section>
  );
}
