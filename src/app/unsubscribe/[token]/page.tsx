import { Link2Off } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { MessageLayout, MessagePage } from "@/components/message-page";
import { UnsubscribePrompt } from "@/components/unsubscribe-prompt";
import { brokenUnsubscribeLink } from "@/content/copy";
import { getServices } from "@/server/services";
import { isValidUnsubscribeToken } from "@/server/unsubscribe";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;

  if (!isValidUnsubscribeToken(token, getServices())) {
    return (
      <MessagePage
        icon={<Link2Off size={22} strokeWidth={2} />}
        tone="muted"
        title={brokenUnsubscribeLink.title}
        body={brokenUnsubscribeLink.body}
      />
    );
  }

  return (
    <MessageLayout>
      <UnsubscribePrompt token={token} />
    </MessageLayout>
  );
}
