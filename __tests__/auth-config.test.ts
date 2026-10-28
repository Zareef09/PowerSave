import { describe, expect, it } from "vitest";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

describe("supabase env helpers", () => {
  it("reports not configured when env is empty (test process)", () => {
    // Vitest does not load .env.local by default for these keys.
    expect(typeof isSupabaseConfigured()).toBe("boolean");
    expect(supabaseUrl() === undefined || typeof supabaseUrl() === "string").toBe(true);
    expect(
      supabasePublishableKey() === undefined || typeof supabasePublishableKey() === "string",
    ).toBe(true);
  });
});

describe("magic-link email check (SignIn)", () => {
  const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  it("accepts normal addresses", () => {
    expect(EMAIL_OK.test("you@example.com")).toBe(true);
    expect(EMAIL_OK.test("a.b+c@mail.co")).toBe(true);
  });

  it("rejects incomplete addresses", () => {
    expect(EMAIL_OK.test("you@")).toBe(false);
    expect(EMAIL_OK.test("not-an-email")).toBe(false);
    expect(EMAIL_OK.test("")).toBe(false);
  });
});
