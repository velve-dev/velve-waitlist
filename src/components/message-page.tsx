import type { ReactNode } from "react";
import { MessageBody, type MessageBodyProps } from "./message-body";
import { PageShell } from "./page-shell";

export function MessageLayout({ children }: { children: ReactNode }) {
  return (
    <PageShell>
      <main className="flex flex-1 justify-center px-4 pt-12 pb-[88px] desk:px-6 desk:pt-24 desk:pb-36">
        {children}
      </main>
    </PageShell>
  );
}

export function MessagePage(props: MessageBodyProps) {
  return (
    <MessageLayout>
      <MessageBody {...props} />
    </MessageLayout>
  );
}
