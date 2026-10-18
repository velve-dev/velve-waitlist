import { Check } from "lucide-react";
import type { Metadata } from "next";
import { MessagePage } from "@/components/message-page";
import { SecondaryLink } from "@/components/secondary-link";
import { unsubscribed } from "@/content/copy";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function UnsubscribedPage() {
  return (
    <MessagePage
      icon={<Check size={22} strokeWidth={2} />}
      tone="live"
      title={unsubscribed.title}
      body={unsubscribed.body}
    >
      <div className="mt-6">
        <SecondaryLink href="/">{unsubscribed.back}</SecondaryLink>
      </div>
    </MessagePage>
  );
}
