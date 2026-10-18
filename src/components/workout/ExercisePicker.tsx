import { input, label } from "@/lib/ui";

/** Free-form workouts: type an exercise or pick a previous one. */
export default function ExercisePicker({ value, exercises, onChange }: { value: string; exercises: string[]; onChange: (name: string) => void }) {
  return (
    <div>
      <label htmlFor="exercise" className={label}>
        Exercise
      </label>
      <input
        id="exercise"
        className={input}
        list="exercise-list"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search or type a new one"
        autoComplete="off"
        maxLength={100}
      />
      <datalist id="exercise-list">
        {exercises.map((e) => (
          <option key={e} value={e} />
        ))}
      </datalist>
    </div>
  );
}
