import { saveSettings } from "@/actions/settings";
import PageHeader from "@/components/PageHeader";
import AboutYouSection from "@/components/settings/AboutYouSection";
import CalorieTargetCard from "@/components/settings/CalorieTargetCard";
import CoachConnectionSection from "@/components/settings/CoachConnectionSection";
import CoachInstructionsSection from "@/components/settings/CoachInstructionsSection";
import DailyGoalsSection from "@/components/settings/DailyGoalsSection";
import RemoteAccessSection from "@/components/settings/RemoteAccessSection";
import SecuritySection from "@/components/settings/SecuritySection";
import SetupChecklist from "@/components/settings/SetupChecklist";
import StatusBanner from "@/components/settings/StatusBanner";
import UnitsSection from "@/components/settings/UnitsSection";
import { passcodeEnabled } from "@/lib/auth";
import { getEnergyEstimate } from "@/lib/energy-data";
import { getSettings } from "@/lib/settings";
import { getRemoteStatus } from "@/lib/setup/remote-status";
import { btnPrimary } from "@/lib/ui";

export const dynamic = "force-dynamic";

/** Settings: calorie target, body profile, units, goals, AI coach connection and instructions, security and backup. */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [s, q, remote] = await Promise.all([getSettings(), searchParams, getRemoteStatus()]);
  const energy = await getEnergyEstimate(s);
  const ollamaDefaults = {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    model: process.env.OLLAMA_MODEL || "gemma4:latest",
    reasoning: process.env.OLLAMA_REASONING_EFFORT || "none",
  };

  return (
    <>
      <PageHeader title="Settings" back="/" backLabel="Today" subtitle="Your goals, your body profile, the AI coach and your data." />
      <StatusBanner saved={q.saved} error={q.error} />
      <CalorieTargetCard energy={energy} goals={s} unit={s.weightUnit} />
      {/* Keyed on the saved values: after a save or "use these goals" redirect, React would
          otherwise keep the old typed values, and the next save would write them back. */}
      <form key={JSON.stringify(s)} action={saveSettings} className="space-y-4">
        <input type="hidden" name="displayUnit" value={s.weightUnit} />
        <AboutYouSection s={s} />
        <UnitsSection s={s} />
        <DailyGoalsSection s={s} />
        <CoachConnectionSection s={s} defaults={ollamaDefaults} />
        <CoachInstructionsSection s={s} />
        <button className={`${btnPrimary} w-full`}>Save settings</button>
      </form>
      <SetupChecklist />
      <RemoteAccessSection config={remote.config} status={{ connected: remote.connected, installed: remote.installed, hosts: remote.hosts }} />
      <SecuritySection locked={passcodeEnabled()} />
    </>
  );
}
