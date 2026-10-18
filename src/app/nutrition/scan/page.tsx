import PageHeader from "@/components/PageHeader";
import { formatDay, pastDayParam } from "@/lib/dates";
import { asMeal } from "@/lib/nutrition";
import ScanFlow from "./ScanFlow";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ meal?: string; day?: string }>;
}) {
  const q = await searchParams;
  const day = pastDayParam(q.day);
  return (
    <>
      <PageHeader
        title="Scan food"
        section="food"
        backLabel="Food"
        subtitle={day ? `Adding to ${formatDay(day)}` : "Point the camera at the barcode on the pack."}
        back={day ? `/nutrition?day=${day}` : "/nutrition"}
      />
      <ScanFlow defaultMeal={asMeal(q.meal)} day={day} />
    </>
  );
}
