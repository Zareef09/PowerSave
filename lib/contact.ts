/**
 * Public contact for the Settings “report a problem” mailto.
 * One constant — no server, no third-party form service.
 */
export const CONTACT_EMAIL = "northamericanInventory@gmail.com" as const;

export function reportMailto(opts: {
  category: string;
  details: string;
  replyEmail?: string;
}): string {
  const subject = encodeURIComponent(`PowerSave report: ${opts.category}`);
  const body = encodeURIComponent(
    [
      `Category: ${opts.category}`,
      "",
      opts.details.trim() || "(no details)",
      "",
      opts.replyEmail?.trim()
        ? `Reply-to if possible: ${opts.replyEmail.trim()}`
        : "No reply email provided.",
    ].join("\n"),
  );
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}
