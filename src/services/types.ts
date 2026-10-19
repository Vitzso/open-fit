// Shapes of the JSON the API returns, safe to import from client components
// (no server code). Keep in sync with the route handlers under src/app/api.

/** GET /api/coach/health → health */
export interface CoachHealth {
  ok: boolean;
  baseUrl: string;
  model: string;
  models: string[];
  error?: { error: string; code: string; hint?: string };
}

/** GET /api/coach → messages[] */
export interface ChatHistoryMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

/** GET/POST /api/coach/note → note */
export interface CoachNoteData {
  content: string;
  createdAt: string;
}

export type CheckStatus = "pass" | "warn" | "fail" | "skip";

/** One line of the Ollama checkup. */
export interface CheckupCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  fix?: string;
  ms?: number;
}

/** GET /api/coach/checkup */
export interface CheckupReport {
  baseUrl: string;
  model: string;
  checks: CheckupCheck[];
  summary: Record<CheckStatus, number>;
}

/** One graded coach self-test case. */
export interface SelfTestCase {
  id: string;
  title: string;
  why: string;
  question: string;
  passed: boolean;
  checks: { name: string; pass: boolean }[];
  reply: string;
  ms: number;
  error?: string;
}

/** One row of GET /api/setup/status. */
export interface SetupItem {
  id: string;
  label: string;
  ok: boolean;
  optional?: boolean;
  detail: string;
  fix?: string;
}

/** An address to open OpenFit at on a phone (from GET /api/setup/status). */
export interface PhoneAddress {
  label: string;
  url: string;
}

/** Lines of the POST /api/setup/model NDJSON stream. */
export type ModelDownloadEvent =
  | { type: "progress"; status: string; completed?: number; total?: number }
  | { type: "done" }
  | { type: "error"; error: string };

/** Lines of the POST /api/coach/selftest NDJSON stream. */
export type SelfTestEvent =
  | { type: "start"; total: number }
  | ({ type: "case" } & SelfTestCase)
  | { type: "done"; passed: number; total: number };

export interface CoachReportData {
  id: number;
  rangeDays: number;
  content: string;
  createdAt: string;
}
