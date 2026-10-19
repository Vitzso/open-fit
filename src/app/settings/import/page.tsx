import PageHeader from "@/components/PageHeader";
import ImportPanel from "@/components/settings/ImportPanel";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Import history from other apps or an OpenFit backup. */
export default async function ImportPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Import" back="/settings" backLabel="Settings" subtitle="From MyFitnessPal, Strong, Hevy or an OpenFit backup." />
      <ImportPanel defaultUnit={s.weightUnit} />
    </>
  );
}
