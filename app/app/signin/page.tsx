import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInPage } from "@/components/auth/SignInPage";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Optional magic-link sign-in so your plan and chores follow you across devices.",
};

export default function SignInRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-page text-muted">
          Loading…
        </div>
      }
    >
      <SignInPage />
    </Suspense>
  );
}
