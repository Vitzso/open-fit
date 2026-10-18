// Ollama checkup: independent checks that explain, in plain language, whether
// the AI coach will work, how fast it is, and whether Ollama is exposed beyond
// this PC. Uses Ollama's native /api/* endpoints because they report details
// (load time, GPU use, token speed) that the OpenAI-compatible API does not.
import { resolveOllamaConfig } from "../config";
import type { OllamaConfig } from "../types";
import { checkCapabilities } from "./checks/capabilities";
import { checkContextFit } from "./checks/context-fit";
import { checkCors } from "./checks/cors";
import { checkExposure } from "./checks/exposure";
import { checkGeneration } from "./checks/generation";
import { checkGpu } from "./checks/gpu";
import { checkModel } from "./checks/model";
import { checkReachable } from "./checks/reachable";
import type { Check, CheckStatus, CheckStep, CheckupReport, CheckupState } from "./types";

/** Run order matters: later checks use facts recorded by earlier ones. */
const STEPS: CheckStep[] = [
  checkReachable,
  checkModel,
  checkCapabilities,
  checkGeneration,
  checkGpu,
  checkContextFit,
  checkExposure,
  checkCors,
];

/** Counts checks per status. */
function summarize(checks: Check[]): Record<CheckStatus, number> {
  const summary = { pass: 0, warn: 0, fail: 0, skip: 0 };
  for (const c of checks) summary[c.status]++;
  return summary;
}

/** Runs every check in order and returns the full report. */
export async function runOllamaCheckup(overrides: Partial<OllamaConfig> = {}, coachPromptChars?: number): Promise<CheckupReport> {
  const state: CheckupState = { cfg: resolveOllamaConfig(overrides), coachPromptChars, reachable: false, caps: [], generated: false };
  const checks: Check[] = [];
  for (const step of STEPS) checks.push(...(await step(state)));
  return { baseUrl: state.cfg.baseUrl, model: state.cfg.model, startedAt: new Date().toISOString(), checks, summary: summarize(checks) };
}
