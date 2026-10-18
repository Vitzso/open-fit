// Public API of the AI coach library. Import from "@/lib/coach", not the files inside.
import "server-only";

export { COACH_SYSTEM_PROMPT, NOTE_REQUEST } from "./prompt";
export { buildCoachMessages, coachSystemMessage, HISTORY_CHAR_BUDGET, type CoachPromptInput } from "./messages";
export { COACH_INSTRUCTIONS_MAX, formatCoachInstructions } from "./instructions";
export { formatSafetyFlags, safetyFlags } from "./safety";
export { formatEnergy } from "./sections/energy";
export { buildCoachContext, type CoachContext } from "./context";
export { runCoachSelfTest, SELF_TEST_CASES, type SelfTestResult } from "./selftest";
