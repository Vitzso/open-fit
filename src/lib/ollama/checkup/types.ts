// Types for the Ollama checkup.
import type { OllamaConfig } from "../types";

export type CheckStatus = "pass" | "warn" | "fail" | "skip";

/** One line of the report, in plain language. */
export interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  fix?: string;
  ms?: number;
}

export interface CheckupReport {
  baseUrl: string;
  model: string;
  startedAt: string;
  checks: Check[];
  summary: Record<CheckStatus, number>;
}

/** A model as listed by GET /api/tags. */
export interface TagModel {
  name: string;
  size: number;
  details?: { parameter_size?: string; quantization_level?: string; family?: string };
}

/**
 * Facts gathered so far. Checks run in order; each reads what earlier checks
 * found (e.g. "is it reachable?") and records what later checks need.
 */
export interface CheckupState {
  cfg: OllamaConfig;
  /** Size of the real coach prompt, for the context-window check. */
  coachPromptChars?: number;
  reachable: boolean;
  installed?: TagModel;
  caps: string[];
  modelMaxCtx?: number;
  generated: boolean;
  runtimeCtx?: number;
}

/** A single check: returns zero or more report lines and may add facts to the state. */
export type CheckStep = (state: CheckupState) => Promise<Check[]>;
