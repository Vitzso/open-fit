// Getting Pro training ready when it's switched on.
import "server-only";
import { ensureLibrary } from "./library";

/** Downloads the exercise library if needed. The rest of the module works without it. */
export async function prepareTrainingPro(): Promise<{ ok: boolean; message?: string }> {
  try {
    const n = await ensureLibrary();
    return { ok: true, message: `Exercise library ready: ${n} exercises.` };
  } catch (e) {
    return {
      ok: false,
      message: `Pro training is on, but the exercise library couldn't be downloaded (${(e as Error).message}). Everything else works; switch it off and on again to retry.`,
    };
  }
}
