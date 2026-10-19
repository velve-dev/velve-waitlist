import { Check, CheckCheck, Link2Off } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Hero } from "@/components/hero";
import { MessagePage } from "@/components/message-page";
import { Notice, NoticeText } from "@/components/notice";
import { PageShell } from "@/components/page-shell";
import { QuestionsBlock } from "@/components/questions-block";
import { SecondaryLink } from "@/components/secondary-link";
import { TrackSignupConfirmed } from "@/components/track-event";
import { alreadyIn, brokenConfirmLink, confirmed, links, share } from "@/content/copy";
import { confirmSignup } from "@/server/confirm";
import { getServices } from "@/server/services";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const threadsShareUrl = `https://www.threads.com/intent/post?text=${encodeURIComponent(share.text)}`;

function QuestionsDivider() {
  return <hr aria-hidden="true" className="my-8 h-px w-full border-0 bg-line" />;
}

export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const outcome = await confirmSignup(token, getServices());

  if (outcome.kind === "invalidLink") {
    return (
      <MessagePage
        icon={<Link2Off size={22} strokeWidth={2} />}
        tone="muted"
        title={brokenConfirmLink.title}
        body={brokenConfirmLink.body}
      />
    );
  }

  return (
    <PageShell>
      <Hero>
        {outcome.kind === "confirmed" ? (
          <Notice
            icon={<Check size={22} strokeWidth={2} />}
            tone="live"
            title={
              outcome.firstName === ""
                ? confirmed.title
                : confirmed.titleWithName.replace("{name}", outcome.firstName)
            }
          >
            <NoticeText>{confirmed.body}</NoticeText>
            <QuestionsDivider />
            <QuestionsBlock token={outcome.questionsToken} layout="inline" />
            <div className="flex w-full flex-col items-stretch justify-center gap-2 pt-10 desk:w-auto desk:flex-row desk:flex-wrap">
              <SecondaryLink href={links.threads}>
                {confirmed.threads.replace(" ↗", "")}
              </SecondaryLink>
              <SecondaryLink href={links.github}>
                {confirmed.github.replace(" ↗", "")}
              </SecondaryLink>
              <SecondaryLink href={threadsShareUrl} newTab>
                {share.label.replace(" ↗", "")}
              </SecondaryLink>
            </div>
            <TrackSignupConfirmed />
          </Notice>
        ) : (
          <Notice
            icon={<CheckCheck size={22} strokeWidth={2} />}
            tone="live"
            title={alreadyIn.title}
          >
            <NoticeText>{alreadyIn.body}</NoticeText>
            <QuestionsDivider />
            <QuestionsBlock token={outcome.questionsToken} layout="inline" />
          </Notice>
        )}
      </Hero>
    </PageShell>
  );
}
