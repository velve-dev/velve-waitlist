"use client";

import { Mail } from "lucide-react";
import { useEffect, useRef } from "react";
import { submitted } from "@/content/copy";
import { IconTile } from "./icon-tile";

export function SubmittedNotice({ email, onTypo }: { email: string; onTypo: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [beforeEmail = "", afterEmail = ""] = submitted.body.split("{email}");
  const punctuation = afterEmail.replace(submitted.typo, "");

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section aria-live="polite" className="flex flex-col items-center gap-2">
      <IconTile tone="primary" spacing="compact">
        <Mail size={22} strokeWidth={2} />
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          className="absolute -top-[5px] -right-[5px] overflow-visible"
        >
          <circle cx="7" cy="7" r="5" fill="#7B5CFF" stroke="#050509" strokeWidth="2" />
          <circle
            cx="7"
            cy="7"
            r="5"
            fill="none"
            stroke="#7B5CFF"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            className="velve-pulse velve-pulse-accent"
          />
        </svg>
      </IconTile>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="m-0 text-20 leading-[1.35] font-semibold tracking-[-0.01em] outline-none"
      >
        {submitted.title}
      </h2>
      <p className="m-0 text-14 leading-[1.55] text-muted">
        {beforeEmail}
        <span className="font-mono text-13 font-medium text-primary">{email}</span>
        {punctuation}
        <button
          type="button"
          onClick={onTypo}
          className="cursor-pointer border-0 bg-transparent p-0 text-link underline [font:inherit]"
        >
          {submitted.typo}
        </button>
      </p>
    </section>
  );
}
