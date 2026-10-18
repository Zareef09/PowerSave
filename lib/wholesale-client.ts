import type { WholesalePayload } from "@/lib/ieso";

export async function fetchWholesale(signal?: AbortSignal): Promise<WholesalePayload | null> {
  try {
    const res = await fetch("/api/wholesale", {
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      try {
        return (await res.json()) as WholesalePayload;
      } catch {
        return null;
      }
    }
    return (await res.json()) as WholesalePayload;
  } catch {
    return null;
  }
}
