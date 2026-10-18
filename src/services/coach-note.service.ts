// Today's coach note on the home screen (GET / POST /api/coach/note).
import { requestJson } from "./http";
import type { CoachNoteData } from "./types";

/** Today's saved note, or null if none was written yet. */
export const fetchTodayNote = () => requestJson<{ note: CoachNoteData | null }>("/api/coach/note");

/** Asks the coach to write (or rewrite) today's note. Can take several seconds. */
export const writeTodayNote = () => requestJson<{ note?: CoachNoteData }>("/api/coach/note", { method: "POST" });
