"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { form, formErrors } from "@/content/copy";
import { findEmailProblem, type EmailProblem } from "@/lib/email";
import { trackEvent } from "@/lib/analytics";
import { SubmittedNotice } from "./submitted-notice";
import { useDesktopLayout } from "./use-desktop-layout";

type Problem = EmailProblem | "rateLimited" | "failed";
type Field = "name" | "email";

const problemMessages: Record<Problem, string> = {
  missing: formErrors.missing,
  noAt: formErrors.noAt,
  noDomainEnding: formErrors.noDomainEnding,
  rateLimited: formErrors.rateLimited,
  failed: formErrors.failed,
};

const emailProblems: readonly Problem[] = ["missing", "noAt", "noDomainEnding"];
const errorId = "f-email-error";

function isEmailProblem(value: unknown): value is EmailProblem {
  return typeof value === "string" && emailProblems.includes(value as Problem);
}

function retryAfterMs(response: Response): number {
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60_000;
}

async function requestSignup(fields: {
  email: string;
  name: string;
  website: string;
  formToken: string;
}): Promise<{ outcome: "accepted" } | { outcome: "problem"; problem: Problem; waitMs?: number }> {
  try {
    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (response.ok) return { outcome: "accepted" };
    if (response.status === 429) {
      return { outcome: "problem", problem: "rateLimited", waitMs: retryAfterMs(response) };
    }
    if (response.status === 400) {
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      return { outcome: "problem", problem: isEmailProblem(body?.error) ? body.error : "failed" };
    }
    return { outcome: "problem", problem: "failed" };
  } catch {
    return { outcome: "problem", problem: "failed" };
  }
}

export function WaitlistForm({ formToken }: { formToken: string }) {
  const desktop = useDesktopLayout();
  const emailRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [focus, setFocus] = useState<Field | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [limitedUntil, setLimitedUntil] = useState<number | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [emailFocusRequest, setEmailFocusRequest] = useState(0);

  useEffect(() => {
    if (limitedUntil === null) return;
    const timer = window.setTimeout(
      () => {
        setLimitedUntil(null);
        setProblem((current) => (current === "rateLimited" ? null : current));
      },
      Math.max(0, limitedUntil - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [limitedUntil]);

  useEffect(() => {
    if (emailFocusRequest > 0) emailRef.current?.focus();
  }, [emailFocusRequest]);

  const limited = limitedUntil !== null;
  const hasEmail = email.trim() !== "";
  const buttonDisabled = !hasEmail || limited;
  const badInput = problem !== null && isEmailProblem(problem);
  const anyFocus = focus !== null;

  const fieldBorder = (field: Field) =>
    field === "email" && badInput
      ? "border-failed"
      : focus === field
        ? "border-accent"
        : "border-line";
  const nameRing = focus === "name" ? "shadow-ring" : "shadow-none";
  const emailRing = focus === "email" && problem === null ? "shadow-ring" : "shadow-none";
  const barBorder = badInput
    ? "desk:border-failed"
    : anyFocus
      ? "desk:border-accent"
      : "desk:border-line";
  const barRing = anyFocus && problem === null ? "desk:shadow-ring" : "desk:shadow-none";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || limited) return;
    const emailProblem = findEmailProblem(email);
    if (emailProblem !== null) {
      setProblem(emailProblem);
      setEmailFocusRequest((count) => count + 1);
      return;
    }
    setSending(true);
    const result = await requestSignup({ email: email.trim(), name, website, formToken });
    setSending(false);
    if (result.outcome === "accepted") {
      trackEvent("signup_submitted");
      setProblem(null);
      setFocus(null);
      setSentTo(email.trim());
      return;
    }
    setProblem(result.problem);
    if (result.waitMs !== undefined) setLimitedUntil(Date.now() + result.waitMs);
    setEmailFocusRequest((count) => count + 1);
  }

  function startOver() {
    setSentTo(null);
    setEmail("");
    setProblem(null);
    setEmailFocusRequest((count) => count + 1);
  }

  if (sentTo !== null) return <SubmittedNotice email={sentTo} onTypo={startOver} />;

  const inputBase =
    "box-border min-w-0 bg-card text-left text-primary outline-none placeholder:text-faint transition-[border-color,box-shadow] duration-120 ease-velve h-12 rounded border px-[14px] text-16 font-medium desk:h-10 desk:rounded-none desk:border-0 desk:bg-transparent desk:px-3 desk:text-13 desk:shadow-none";

  return (
    <form
      noValidate
      aria-label={form.label}
      onSubmit={(event) => void submit(event)}
      className="flex w-full flex-col gap-3"
    >
      <label htmlFor="f-name" className="sr-only">
        {form.nameLabel}
      </label>
      <label htmlFor="f-email" className="sr-only">
        {form.emailLabel}
      </label>

      <div
        className={`flex flex-col gap-2 desk:flex-row desk:items-center desk:gap-1 desk:rounded desk:border desk:bg-card desk:p-1 desk:transition-[border-color,box-shadow] desk:duration-120 desk:ease-velve ${barBorder} ${barRing}`}
      >
        <input
          id="f-name"
          name="name"
          type="text"
          autoComplete="given-name"
          maxLength={40}
          placeholder={desktop ? form.namePlaceholderDesktop : form.namePlaceholderMobile}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onFocus={() => setFocus("name")}
          onBlur={() => setFocus(null)}
          className={`${inputBase} font-sans desk:flex-[0_0_140px] ${fieldBorder("name")} ${nameRing}`}
        />
        <span aria-hidden="true" className="hidden h-5 w-px shrink-0 bg-line desk:block" />
        <input
          ref={emailRef}
          id="f-email"
          name="email"
          type="text"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={form.emailPlaceholder}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (problem !== "rateLimited") setProblem(null);
          }}
          onFocus={() => setFocus("email")}
          onBlur={() => setFocus(null)}
          aria-invalid={badInput}
          aria-describedby={problem === null ? undefined : errorId}
          className={`${inputBase} font-mono tracking-[-0.01em] desk:flex-auto ${fieldBorder("email")} ${emailRing}`}
        />
        <button
          type="submit"
          disabled={buttonDisabled}
          aria-busy={sending}
          className="h-12 shrink-0 cursor-pointer rounded border-0 bg-accent-fill px-5 font-sans text-14 font-semibold text-on-accent transition-opacity duration-120 ease-velve desk:h-10 desk:rounded-sm"
        >
          {form.submit}
        </button>
      </div>

      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      {problem !== null && (
        <p
          id={errorId}
          role="alert"
          className={`m-0 text-13 leading-normal font-medium ${problem === "rateLimited" ? "text-warning" : "text-failed"}`}
        >
          {problemMessages[problem]}
        </p>
      )}

      <p className="m-0 text-13 leading-normal text-muted">
        {form.finePrint}{" "}
        <Link href="/privacy" className="text-muted underline">
          {form.privacy}
        </Link>
      </p>
    </form>
  );
}
