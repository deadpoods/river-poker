export async function api<T>(
  url: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers:
        data === undefined ? undefined : { "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error(
      "We could not reach the table. Check your connection and try again.",
    );
  }
  const result = await response.json().catch(() => ({
    error: "The table returned an unexpected response. Please try again.",
  }));
  if (!response.ok)
    throw new Error(result.error || "Something went wrong. Please try again.");
  return result as T;
}
export const chips = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
export const signedChips = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${chips(Math.abs(n))}`;
export const dateLabel = (n: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    n,
  );

