/** "Settings saved." or "Not saved: …", from the URL after a save. */
export default function StatusBanner({ saved, error }: { saved?: string; error?: string }) {
  return (
    <>
      {saved && (
        <p className="mb-4 rounded-xl bg-plate-green/15 p-3 text-[15px]">
          {saved === "targets" ? "Your daily goals now match the coach's targets." : "Settings saved."}
        </p>
      )}
      {error && <p className="mb-4 rounded-xl bg-plate-red/15 p-3 text-[15px]">Not saved: {error.slice(0, 200)}</p>}
    </>
  );
}
