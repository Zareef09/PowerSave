import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Coming soon — PowerSave v1 works as a guest with no login wall.",
};

export default function SignInPage() {
  return <ComingSoon title="Sign in" />;
}
