import OllamaDiagnostics from "@/components/coach/diagnostics/OllamaDiagnostics";
import PageHeader from "@/components/PageHeader";

export default function CheckupPage() {
  return (
    <>
      <PageHeader title="AI check-up" section="coach" subtitle="Is the AI coach working, and is it private?" back="/coach" backLabel="Coach" />
      <OllamaDiagnostics />
    </>
  );
}
