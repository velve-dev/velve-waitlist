import { pill } from "@/content/copy";

export function CommandPill() {
  return (
    <div
      aria-hidden="true"
      className="inline-flex h-8 items-center gap-2 rounded-sm border border-line bg-card px-3 font-mono text-12 font-medium tracking-[-0.01em] whitespace-nowrap"
    >
      <span className="text-faint">{pill.prompt}</span>
      <span className="velve-typed text-primary">{pill.command}</span>
      <span className="velve-live inline-flex items-center gap-1.5 text-live">
        <svg width="10" height="10" viewBox="0 0 10 10" className="overflow-visible">
          <circle cx="5" cy="5" r="3" fill="currentColor" />
          <circle
            cx="5"
            cy="5"
            r="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            className="velve-pulse velve-pulse-live"
          />
        </svg>
        {pill.live}
      </span>
    </div>
  );
}
