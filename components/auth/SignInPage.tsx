"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function SignInPage() {
  const { configured, user, email: signedEmail, signOut } = useAuth();
  const search = useSearchParams();
  const linkError = search.get("error") === "link";

  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<"form" | "sent">("form");
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [sendError, setSendError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_OK.test(trimmed)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setSendError("");

    if (!configured) {
      setSendError(
        "Accounts aren’t connected yet. Set NEXT_PUBLIC_SUPABASE_URL and a publishable key in .env.local.",
      );
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setSendError("Couldn’t start sign-in. Try again.");
      return;
    }

    setBusy(true);
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${origin}/auth/callback?next=/app`,
      },
    });
    setBusy(false);

    if (error) {
      setSendError(error.message || "Couldn’t send the link. Try again in a minute.");
      return;
    }

    setEmail(trimmed);
    setStage("sent");
    setNote("");
  };

  const resend = async () => {
    setNote("");
    setBusy(true);
    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      return;
    }
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${origin}/auth/callback?next=/app`,
      },
    });
    setBusy(false);
    setNote(error ? error.message : "Sent again.");
  };

  if (user) {
    return (
      <div className="flex min-h-screen flex-col bg-page text-ink">
        <SiteNav />
        <main
          id="main-content"
          className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center gap-6 px-4 py-16 sm:px-6 md:py-24"
        >
          <div className="font-mono-label text-muted">/SIGN-IN</div>
          <h1 className="m-0 text-[40px] font-light leading-none tracking-[-0.03em] md:text-[56px]">
            You&apos;re <span className="text-muted">signed in.</span>
          </h1>
          <p className="m-0 text-lg text-muted">
            Signed in as <b className="font-medium text-ink">{signedEmail}</b>. Settings sync across
            devices when you change them.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/app"
              className="inline-flex min-h-12 items-center rounded-btn bg-ink px-5 font-medium text-page no-underline"
            >
              Open Today
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex min-h-12 items-center rounded-btn border border-ink px-5 font-medium"
            >
              Sign out
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      <SiteNav />
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center gap-6 px-4 py-16 sm:px-6 md:py-24"
      >
        <div className="font-mono-label text-muted">/SIGN-IN</div>

        {stage === "form" ? (
          <>
            <h1 className="m-0 text-[40px] font-light leading-none tracking-[-0.03em] md:text-[56px]">
              Save across <span className="text-muted">devices.</span>
            </h1>
            <p className="m-0 text-lg leading-normal text-muted">
              Optional. PowerSave works fully without an account. Signing in only saves your plan
              and chores so they follow you to your phone and laptop.
            </p>

            {!configured ? (
              <div role="status" className="rounded-xl border border-hairline bg-surface px-4 py-3 text-sm leading-normal text-muted-strong">
                Cloud sync isn&apos;t connected on this deploy yet. Use{" "}
                <Link href="/app" className="text-accent">
                  Continue as guest
                </Link>{" "}
                — everything on Today, chores and Settings still works on this device.
              </div>
            ) : null}

            {linkError ? (
              <div role="alert" className="rounded-xl border border-ink px-4 py-3 text-sm">
                That link expired or was already used. Request a new one below.
              </div>
            ) : null}

            <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
              <label className="flex flex-col gap-1.5 text-sm">
                Email
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? "err" : undefined}
                  className="min-h-11 rounded-btn border border-hairline bg-surface px-3 text-base text-ink"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setInvalid(false);
                  }}
                />
              </label>
              {invalid ? (
                <div id="err" role="alert" className="flex gap-2 text-sm">
                  <span>Enter a full email address, like you@example.com.</span>
                </div>
              ) : null}
              {sendError ? (
                <div role="alert" className="text-sm text-muted-strong">
                  {sendError}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={busy || !configured}
                className="inline-flex min-h-12 items-center justify-center rounded-btn bg-ink px-5 font-medium text-page disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send magic link"}
              </button>
            </form>
            <p className="m-0 text-[13px] leading-normal text-muted-strong">
              We email a one-time link. No password. We store only your email, plan and chores.{" "}
              <Link href="/privacy" className="text-accent">
                Privacy
              </Link>
            </p>
            <Link href="/app" className="text-sm text-accent">
              Continue as guest →
            </Link>
          </>
        ) : (
          <>
            <h1 className="m-0 text-[40px] font-light leading-none tracking-[-0.03em] md:text-[56px]">
              Check <span className="text-muted">your email.</span>
            </h1>
            <p className="m-0 text-lg leading-normal">
              We sent a link to <b className="font-medium">{email}</b>. Open it on this device to
              finish signing in.
            </p>
            <p className="m-0 text-sm text-muted-strong">
              {note || "Nothing yet? Check spam, or send it again."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void resend()}
                className="inline-flex min-h-11 items-center rounded-btn border border-ink px-4 text-sm font-medium disabled:opacity-60"
              >
                Send again
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage("form");
                  setEmail("");
                  setNote("");
                }}
                className="inline-flex min-h-11 items-center rounded-btn border border-ink px-4 text-sm font-medium"
              >
                Use a different email
              </button>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
