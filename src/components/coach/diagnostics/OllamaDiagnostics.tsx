"use client";

import CheckupSection from "./CheckupSection";
import SelfTestSection from "./SelfTestSection";
import { useCheckup } from "./useCheckup";
import { useSelfTest } from "./useSelfTest";

/** The AI check-up screen: Ollama checkup and coach self-test. Only one runs at a time. */
export default function OllamaDiagnostics() {
  const checkup = useCheckup();
  const test = useSelfTest();
  return (
    <div className="space-y-6">
      <CheckupSection report={checkup.report} running={checkup.running} error={checkup.error} disabled={test.running} onRun={() => void checkup.run()} />
      <SelfTestSection
        cases={test.cases}
        total={test.total}
        passed={test.passed}
        running={test.running}
        error={test.error}
        disabled={checkup.running}
        onRun={() => void test.run()}
        onStop={test.stop}
      />
    </div>
  );
}
