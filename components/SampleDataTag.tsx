export function SampleDataTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-mono-label inline-block whitespace-nowrap rounded-full border border-muted px-2.5 py-0.5 text-[10px] text-muted-strong ${className}`}
    >
      Sample data
    </span>
  );
}
