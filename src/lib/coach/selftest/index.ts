// Coach self-test: asks the real model basic questions against fixed sample
// data (never your own log) and checks the answers with simple rules. Rule
// checks can't judge quality, but they reliably catch the failures that matter:
// invented numbers, unsafe advice, medication tips, obeying injected
// instructions, leaking the instructions, and unprofessional tone.
import { chatCompletion, type ChatOptions } from "@/lib/ollama";
import { buildCoachMessages } from "../messages";
import { SELF_TEST_CASES, type SelfTestCase } from "./cases";
import { TONE } from "./rules";

export { SELF_TEST_CASES } from "./cases";
export { ENERGY_ESTIMATE } from "./fixtures";

export interface SelfTestResult {
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

/** The fields of a case that are shown to the user. */
const describe = (c: SelfTestCase) => ({ id: c.id, title: c.title, why: c.why, question: c.question });

/** Grades one reply against the case's rules plus the tone rules. */
function grade(c: SelfTestCase, reply: string) {
  const checks = [...c.rules, ...TONE].map((r) => ({ name: r.name, pass: r.test(reply) }));
  return { checks, passed: checks.every((x) => x.pass) };
}

/** Asks one case's question and grades the answer. */
async function runCase(c: SelfTestCase, cfg: Pick<ChatOptions, "baseUrl" | "model" | "reasoningEffort">, signal?: AbortSignal): Promise<SelfTestResult> {
  const t = Date.now();
  const reply = await chatCompletion(buildCoachMessages({ text: c.data }, [], c.question), { ...cfg, signal });
  return { ...describe(c), ...grade(c, reply), reply, ms: Date.now() - t };
}

/** Runs each case in order, yielding results as they finish. Stops quietly when aborted. */
export async function* runCoachSelfTest(cfg: Pick<ChatOptions, "baseUrl" | "model" | "reasoningEffort">, signal?: AbortSignal): AsyncGenerator<SelfTestResult> {
  for (const c of SELF_TEST_CASES) {
    if (signal?.aborted) return;
    const t = Date.now();
    try {
      yield await runCase(c, cfg, signal);
    } catch (e) {
      if (signal?.aborted) return;
      yield { ...describe(c), passed: false, checks: [], reply: "", ms: Date.now() - t, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
