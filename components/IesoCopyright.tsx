import { IESO_COPYRIGHT } from "@/lib/ieso";

/** Verbatim IESO Terms of Use copyright — shown wherever IESO-derived data appears. */
export function IesoCopyright({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[12px] leading-relaxed text-muted-strong ${className}`}>{IESO_COPYRIGHT}</p>
  );
}
