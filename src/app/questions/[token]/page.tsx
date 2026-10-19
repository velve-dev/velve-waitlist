import { Link2Off } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { MessageLayout, MessagePage } from "@/components/message-page";
import { QuestionsBlock } from "@/components/questions-block";
import { brokenQuestionsLink } from "@/content/copy";
import { readQuestionsToken } from "@/server/link-tokens";
import { getServices } from "@/server/services";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function QuestionsPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;

  if (readQuestionsToken(token, getServices().config.tokenKey) === null) {
    return (
      <MessagePage
        icon={<Link2Off size={22} strokeWidth={2} />}
        tone="muted"
        title={brokenQuestionsLink.title}
        body={brokenQuestionsLink.body}
      />
    );
  }

  return (
    <MessageLayout>
      <div className="flex w-full max-w-[540px] flex-col items-center justify-center">
        <QuestionsBlock token={token} layout="page" />
      </div>
    </MessageLayout>
  );
}
