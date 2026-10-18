import type { ReactNode } from "react";
import { IconTile } from "./icon-tile";
import { contactEmail } from "@/content/copy";

export type MessageBodyProps = {
  icon: ReactNode;
  tone: "primary" | "live" | "muted";
  eyebrow?: string;
  title: string;
  body: string;
  children?: ReactNode;
};

export function MessageBody({ icon, tone, eyebrow, title, body, children }: MessageBodyProps) {
  return (
    <div className="flex min-h-[440px] w-full max-w-[460px] flex-col items-center justify-center gap-2 text-center desk:min-h-[520px]">
      <IconTile tone={tone} spacing="page">
        {icon}
      </IconTile>
      {eyebrow !== undefined && (
        <span className="font-mono text-12 font-medium tracking-[-0.01em] text-muted">
          {eyebrow}
        </span>
      )}
      <h1 className="m-0 text-28 leading-[1.2] font-semibold tracking-[-0.02em]">{title}</h1>
      <p className="m-0 text-16 leading-[1.55] text-muted">
        <WithContactLink text={body} />
      </p>
      {children}
    </div>
  );
}

function WithContactLink({ text }: { text: string }) {
  const [before, after] = text.split(contactEmail);
  if (after === undefined) return text;
  return (
    <>
      {before}
      <a href={`mailto:${contactEmail}`} className="text-link underline">
        {contactEmail}
      </a>
      {after}
    </>
  );
}
