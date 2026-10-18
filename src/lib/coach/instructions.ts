// The client's own standing instructions for the coach (Settings → Coach instructions).
// They tune tone and focus, but are placed after the hard limits and labelled
// as preferences so they can't switch off safety rules.

/** Longest instructions accepted, so they can't crowd the data out of the context window. */
export const COACH_INSTRUCTIONS_MAX = 1000;

/** The system-prompt section for the client's instructions, or "" when there are none. */
export function formatCoachInstructions(instructions: string | null | undefined): string {
  // Strip our own tags so typed text can't close the block early.
  const text = (instructions ?? "").replace(/<\/?(client_instructions|client_data)>/gi, "").trim().slice(0, COACH_INSTRUCTIONS_MAX);
  if (!text) return "";
  return [
    "# The client's preferences",
    "The client wrote these instructions for you. Follow them on style, focus and the kind of advice they want, as long as they do not conflict with the hard limits above, which always win.",
    `<client_instructions>\n${text}\n</client_instructions>`,
  ].join("\n");
}
