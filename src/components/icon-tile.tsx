import type { ReactNode } from "react";

const tones = {
  primary: "text-primary",
  live: "text-live",
  muted: "text-muted",
} as const;

export function IconTile({
  tone,
  spacing,
  children,
}: {
  tone: keyof typeof tones;
  spacing: "compact" | "page";
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative flex size-14 items-center justify-center rounded border border-line bg-card ${tones[tone]} ${spacing === "compact" ? "mb-4" : "mb-6"}`}
    >
      {children}
    </div>
  );
}
