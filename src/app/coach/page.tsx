import CoachChat from "@/components/coach/CoachChat";
import PageHeader from "@/components/PageHeader";

export default function CoachPage() {
  return (
    <>
      <PageHeader title="Coach" section="coach" subtitle="Your AI coach runs on your PC. Nothing leaves your network." />
      <CoachChat />
    </>
  );
}
