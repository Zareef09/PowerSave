import Link from "next/link";

export function SiteFooter() {
  return (
    <div className="border-t border-hairline">
      <div className="mx-auto box-border max-w-content px-6 pb-10 pt-14 md:px-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_1fr_2fr]">
          <div>
            <div className="text-[22px] font-medium tracking-[-0.03em]">PowerSave</div>
            <div className="font-mono-label mt-3 text-muted-strong">[ V1 · RATES NOV 1 2026 ]</div>
          </div>
          <div className="flex flex-col gap-3 text-[15px]">
            <Link href="/how-it-works" className="text-ink no-underline">
              How it works
            </Link>
            <Link href="/plan" className="text-ink no-underline">
              Plans
            </Link>
            <Link href="/privacy" className="text-ink no-underline">
              Privacy
            </Link>
          </div>
          <div className="text-sm leading-relaxed text-muted">
            Rates: Ontario Energy Board, effective November 1, 2026. Grid data: IESO public
            reports. Sources are credited in text only.
            <br />
            PowerSave is independent. It is not affiliated with or endorsed by the Ontario Energy
            Board, the IESO or any utility.
          </div>
        </div>
      </div>
    </div>
  );
}
