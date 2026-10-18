import { input, label } from "@/lib/ui";

/** A labelled text input for the Settings form (numeric keyboard unless overridden). */
export default function Field({
  name,
  text,
  value,
  ...extra
}: { name: string; text: string; value: number | string | null | undefined } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "value">) {
  return (
    <div>
      <label htmlFor={name} className={label}>
        {text}
      </label>
      <input id={name} name={name} className={input} defaultValue={value ?? ""} inputMode="numeric" {...extra} />
    </div>
  );
}
