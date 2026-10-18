/** One big rounded number with a small caption, e.g. "245 / KCAL". */
export default function MacroStat({ name, value }: { name: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-semibold">{Math.round(value)}</p>
      <p className="text-[11px] uppercase text-muted">{name}</p>
    </div>
  );
}
