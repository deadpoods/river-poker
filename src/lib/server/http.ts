import { createHash } from "node:crypto";
import { GameError } from "../poker/engine";

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // Next's development server may normalize request.url to localhost while
  // the browser uses 127.0.0.1. The HTTP Host is the actual browser destination.
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    url.protocol.replace(":", "");
  if (origin && origin !== `${protocol}://${host}`)
    throw new GameError("This request came from a different site.", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new GameError("This request came from a different site.", 403);
}

export async function body(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length") || 0) > 4096)
    throw new GameError("The request is too large.", 413);
  const text = await request.text();
  if (text.length > 4096) throw new GameError("The request is too large.", 413);
  try {
    const value = JSON.parse(text || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value;
  } catch {
    throw new GameError("Please send a valid request.");
  }
}

export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const clientBucket = (request: Request) =>
  hash(request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local");

export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store, private" },
  });
}

export function failure(error: unknown) {
  if (error instanceof GameError)
    return json({ error: error.message }, error.status);
  const id = crypto.randomUUID();
  console.error("river_request_failed", {
    id,
    message:
      error instanceof Error
        ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[database]")
        : "Unknown error",
  });
  const missingDb =
    error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED";
  return json(
    {
      error: missingDb
        ? "The table service is being connected. Please try again shortly."
        : "The table service is temporarily unavailable. Your last confirmed state is saved. Please try again.",
      reference: id,
    },
    503,
  );
}

export function textInput(value: unknown, name: string, max: number) {
  const clean =
    typeof value === "string"
      ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim()
      : "";
  if (!clean || clean.length > max)
    throw new GameError(`${name} must be between 1 and ${max} characters.`);
  return clean;
}

export function integer(
  value: unknown,
  name: string,
  min: number,
  max: number,
) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new GameError(`${name} must be between ${min} and ${max}.`);
  return value;
}
