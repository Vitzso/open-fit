"use client";

/** A submit button that asks before running a destructive form action. */
export default function ConfirmSubmit({
  message,
  className,
  label,
  children,
}: {
  message: string;
  className?: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={className}
      aria-label={label}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
