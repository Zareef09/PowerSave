import { describe, expect, it } from "vitest";
import { CONTACT_EMAIL, reportMailto } from "@/lib/contact";

describe("contact", () => {
  it("uses the configured report inbox", () => {
    expect(CONTACT_EMAIL).toBe("northamericanInventory@gmail.com");
  });

  it("builds a mailto with category, details and optional reply", () => {
    const href = reportMailto({
      category: "A rate looks wrong",
      details: "TOU on-peak looks high at 5 PM",
      replyEmail: "you@example.com",
    });
    expect(href.startsWith(`mailto:${CONTACT_EMAIL}?`)).toBe(true);
    expect(href).toContain(encodeURIComponent("PowerSave report: A rate looks wrong"));
    expect(href).toContain(encodeURIComponent("Category: A rate looks wrong"));
    expect(href).toContain(encodeURIComponent("TOU on-peak looks high at 5 PM"));
    expect(href).toContain(encodeURIComponent("Reply-to if possible: you@example.com"));
  });

  it("notes when no reply email is provided", () => {
    const href = reportMailto({
      category: "Something is broken",
      details: "",
    });
    expect(href).toContain(encodeURIComponent("No reply email provided."));
    expect(href).toContain(encodeURIComponent("(no details)"));
  });
});
