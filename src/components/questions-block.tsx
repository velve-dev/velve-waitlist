"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formErrors, questions } from "@/content/copy";
import { trackEvent } from "@/lib/analytics";
import { firstDeployChoices, runsOnChoices, type FirstDeploy, type RunsOn } from "@/lib/questions";
import { IconTile } from "./icon-tile";
import { SecondaryLink } from "./secondary-link";

type Layout = "inline" | "page";
type Problem = "rateLimited" | "failed";

const problemMessages: Record<Problem, string> = {
  rateLimited: formErrors.rateLimited,
  failed: formErrors.failed,
};

function retryAfterMs(response: Response): number {
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60_000;
}

async function sendVote(
  token: string,
  firstDeploy: FirstDeploy,
  runsOn: RunsOn,
): Promise<{ ok: true } | { ok: false; problem: Problem; waitMs?: number }> {
  try {
    const response = await fetch("/api/questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, firstDeploy, runsOn }),
    });
    if (response.ok) return { ok: true };
    if (response.status === 429) {
      return { ok: false, problem: "rateLimited", waitMs: retryAfterMs(response) };
    }
    return { ok: false, problem: "failed" };
  } catch {
    return { ok: false, problem: "failed" };
  }
}

function ChoiceGroup<T extends string>({
  name,
  legend,
  choices,
  labels,
  selected,
  onSelect,
}: {
  name: string;
  legend: string;
  choices: readonly T[];
  labels: Record<T, string>;
  selected: T | null;
  onSelect: (choice: T) => void;
}) {
  return (
    <fieldset className="m-0 flex w-full min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="mb-3 p-0 text-16 font-medium text-primary">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 desk:flex desk:flex-wrap desk:justify-center">
        {choices.map((choice) => {
          const checked = selected === choice;
          return (
            <label
              key={choice}
              className={`relative inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-sm border px-3 py-2 text-center text-14 leading-tight transition-colors duration-120 ease-velve has-[:focus-visible]:shadow-ring ${
                checked
                  ? "border-muted bg-hover text-primary"
                  : "border-line bg-card text-primary hover:border-line-strong"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={choice}
                checked={checked}
                onChange={() => onSelect(choice)}
                className="sr-only"
              />
              {checked && <Check size={14} strokeWidth={2} aria-hidden="true" />}
              <span>{labels[choice]}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function QuestionsBlock({ token, layout }: { token: string; layout: Layout }) {
  const [firstDeploy, setFirstDeploy] = useState<FirstDeploy | null>(null);
  const [runsOn, setRunsOn] = useState<RunsOn | null>(null);
  const [sending, setSending] = useState(false);
  const [counted, setCounted] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [limitedUntil, setLimitedUntil] = useState<number | null>(null);
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (counted) doneHeadingRef.current?.focus();
  }, [counted]);

  useEffect(() => {
    if (limitedUntil === null) return;
    const timer = window.setTimeout(
      () => {
        setLimitedUntil(null);
        setProblem(null);
      },
      Math.max(0, limitedUntil - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [limitedUntil]);

  const pageLayout = layout === "page";
  const headingClass = pageLayout
    ? "m-0 text-28 leading-[1.2] font-semibold tracking-[-0.02em] focus:outline-none"
    : "m-0 text-20 leading-[1.35] font-semibold tracking-[-0.01em] focus:outline-none";
  const textClass = pageLayout
    ? "m-0 text-16 leading-[1.55] text-muted"
    : "m-0 text-14 leading-[1.55] text-muted";
  const HeadingTag = pageLayout ? "h1" : "h2";

  async function submit() {
    if (firstDeploy === null || runsOn === null || sending || limitedUntil !== null) return;
    setSending(true);
    const result = await sendVote(token, firstDeploy, runsOn);
    setSending(false);
    if (result.ok) {
      trackEvent("questions_answered");
      setProblem(null);
      setCounted(true);
      return;
    }
    setProblem(result.problem);
    if (result.waitMs !== undefined) setLimitedUntil(Date.now() + result.waitMs);
  }

  if (counted) {
    return (
      <section
        aria-live="polite"
        className="velve-fade-in flex w-full flex-col items-center gap-2 text-center"
      >
        <IconTile tone="live" spacing="compact">
          <Check size={22} strokeWidth={2} />
        </IconTile>
        <HeadingTag ref={doneHeadingRef} tabIndex={-1} className={headingClass}>
          {questions.doneTitle}
        </HeadingTag>
        <p className={textClass}>{questions.doneBody}</p>
        {pageLayout && (
          <div className="mt-6">
            <SecondaryLink href="/">{questions.back}</SecondaryLink>
          </div>
        )}
      </section>
    );
  }

  const ready = firstDeploy !== null && runsOn !== null && limitedUntil === null;

  return (
    <section
      aria-labelledby="questions-title"
      className="flex w-full flex-col items-center gap-8 text-center"
    >
      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-12 font-medium tracking-[-0.01em] text-muted">
          {questions.eyebrow}
        </span>
        <HeadingTag id="questions-title" className={headingClass}>
          {questions.title}
        </HeadingTag>
        <p className={textClass}>{questions.body}</p>
      </div>
      <ChoiceGroup
        name="first-deploy"
        legend={questions.firstDeploy.legend}
        choices={firstDeployChoices}
        labels={questions.firstDeploy.options}
        selected={firstDeploy}
        onSelect={setFirstDeploy}
      />
      <ChoiceGroup
        name="runs-on"
        legend={questions.runsOn.legend}
        choices={runsOnChoices}
        labels={questions.runsOn.options}
        selected={runsOn}
        onSelect={setRunsOn}
      />
      <div className="flex w-full flex-col items-center gap-3">
        <button
          type="button"
          disabled={!ready}
          aria-busy={sending}
          onClick={() => void submit()}
          className="h-12 w-full cursor-pointer rounded border-0 bg-accent-fill px-5 font-sans text-14 font-semibold text-on-accent transition-opacity duration-120 ease-velve desk:h-10 desk:w-auto"
        >
          {questions.submit}
        </button>
        {problem !== null && (
          <p
            role="alert"
            className={`m-0 text-13 leading-normal font-medium ${problem === "rateLimited" ? "text-warning" : "text-failed"}`}
          >
            {problemMessages[problem]}
          </p>
        )}
      </div>
    </section>
  );
}
