import type { ReactNode } from "react";
import { hero } from "@/content/copy";
import { CommandPill } from "./command-pill";

export function Hero({ children }: { children: ReactNode }) {
  return (
    <main
      id="top"
      className="flex flex-1 items-center justify-center px-4 pt-14 pb-[88px] desk:px-6 desk:pt-[120px] desk:pb-40"
    >
      <div className="flex w-full max-w-[540px] flex-col items-center gap-10 text-center">
        <CommandPill />
        <div className="flex flex-col gap-3">
          <h1 className="m-0 text-40 leading-[1.1] font-semibold tracking-[-0.025em]">
            {hero.heading}
          </h1>
          <p className="m-0 text-16 leading-normal text-muted">{hero.subline}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
