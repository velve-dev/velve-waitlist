import type { ReactNode } from "react";
import { IconTile } from "./icon-tile";

export function Notice({
  icon,
  tone,
  title,
  children,
}: {
  icon: ReactNode;
  tone: "primary" | "live" | "muted";
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col items-center gap-2">
      <IconTile tone={tone} spacing="compact">
        {icon}
      </IconTile>
      <h2 className="m-0 text-20 leading-[1.35] font-semibold tracking-[-0.01em]">{title}</h2>
      {children}
    </section>
  );
}

export function NoticeText({ children }: { children: ReactNode }) {
  return <p className="m-0 text-14 leading-[1.55] text-muted">{children}</p>;
}
