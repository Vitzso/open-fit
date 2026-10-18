import { input, label } from "@/lib/ui";

/** A labelled <select> for the Settings form, with an uncontrolled default value. */
export default function Select({ name, text, value, children }: { name: string; text: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className={label}>
        {text}
      </label>
      <select id={name} name={name} className={input} defaultValue={value}>
        {children}
      </select>
    </div>
  );
}
