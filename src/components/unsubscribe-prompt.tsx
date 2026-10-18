"use client";

import { Check, MailMinus } from "lucide-react";
import { useState } from "react";
import { formErrors, unsubscribe, unsubscribed } from "@/content/copy";
import { MessageBody } from "./message-body";
import { SecondaryLink } from "./secondary-link";

type Step = "asking" | "sending" | "done" | "failed";

async function requestDeletion(token: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/unsubscribe/${encodeURIComponent(token)}`, {
      method: "POST",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function UnsubscribePrompt({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("asking");

  if (step === "done") {
    return (
      <MessageBody
        icon={<Check size={22} strokeWidth={2} />}
        tone="live"
        title={unsubscribed.title}
        body={unsubscribed.body}
      >
        <div className="mt-6">
          <SecondaryLink href="/">{unsubscribed.back}</SecondaryLink>
        </div>
      </MessageBody>
    );
  }

  async function confirm() {
    setStep("sending");
    setStep((await requestDeletion(token)) ? "done" : "failed");
  }

  return (
    <MessageBody
      icon={<MailMinus size={22} strokeWidth={2} />}
      tone="primary"
      title={unsubscribe.title}
      body={unsubscribe.body}
    >
      <div className="flex w-full flex-col justify-center gap-2 pt-6 desk:flex-row">
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={step === "sending"}
          className="h-12 cursor-pointer rounded border-0 bg-accent-fill px-5 font-sans text-14 font-semibold text-on-accent desk:h-10"
        >
          {unsubscribe.confirm}
        </button>
        <SecondaryLink href="/">{unsubscribe.stay}</SecondaryLink>
      </div>
      {step === "failed" && (
        <p role="alert" className="m-0 pt-2 text-13 leading-normal font-medium text-failed">
          {formErrors.failed}
        </p>
      )}
    </MessageBody>
  );
}
