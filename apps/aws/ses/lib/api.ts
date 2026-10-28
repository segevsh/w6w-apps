import type { HookContext } from "@w6w/types";
import { hostFromConnection } from "./connection.ts";
import { awsUriEncode } from "./sigv4.ts";

/** Percent-encode one path segment (an email address, an ARN, a template name). */
export function seg(value: string): string {
  return awsUriEncode(String(value));
}

/** Build `?a=1&b=2`, skipping unset values; arrays repeat the key. Returns "" when empty. */
export function qs(
  params: Record<string, string | number | boolean | string[] | undefined>,
): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    for (const item of Array.isArray(v) ? v : [v]) {
      parts.push(`${awsUriEncode(k)}=${awsUriEncode(String(item))}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/** A comma/semicolon/newline separated string (or an array) -> a trimmed, non-empty list. */
export function toList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(/[,;\n]+/);
  const out = items.map((s) => s.trim()).filter(Boolean);
  return out.length ? out : undefined;
}

/** A `json` param arrives parsed from the form, or as a string from an expression. */
export function toJson<T = unknown>(value: unknown, what: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${what} is not valid JSON.`);
  }
}

export interface SesError {
  type?: string;
  message?: string;
}

/**
 * SES v2 names the error class in the `x-amzn-ErrorType` header (sometimes suffixed
 * `:http://internal.amazon.com/coral/...`) and carries the text in a JSON `message` (or
 * `Message`) member. The HTTP status is only a hint — 400 covers BadRequest, validation,
 * NotFound-like and quota errors alike.
 */
export function parseError(res: Response, body: string): SesError {
  const header = res.headers.get("x-amzn-errortype") ?? undefined;
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(body) as Record<string, unknown>;
  } catch {
    // not JSON — fall through to the raw text
  }
  const rawType = header ?? (json.__type as string | undefined) ??
    (json.code as string | undefined);
  const type = rawType?.split(":")[0].split("#").pop();
  const message = (json.message ?? json.Message) as string | undefined;
  return { type, message: message ?? (body.trim() || undefined) };
}

export interface CallOptions {
  /** Pre-encoded path, e.g. `/v2/email/identities/${seg(id)}`. */
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Pre-built query string from `qs()`, including the leading `?`. */
  query?: string;
  body?: unknown;
  /** Operation name, for error text only. */
  op: string;
}

/**
 * One SES v2 call. No credentials here — `ctx.fetch` routes through the `aws-iam` `sign` hook,
 * which computes the SigV4 signature. Success bodies are JSON (an empty body on PUT/DELETE
 * resolves to `{}`); any non-2xx throws with the vendor's error type and message.
 */
export async function ses<T = Record<string, unknown>>(
  ctx: HookContext,
  { path, method = "GET", query = "", body, op }: CallOptions,
): Promise<T> {
  const host = hostFromConnection(ctx.connection);
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await ctx.fetch(`https://${host}${path}${query}`, init);
  const text = await res.text();
  if (!res.ok) {
    const err = parseError(res, text);
    throw new Error(
      `${op} returned ${res.status}${err.type ? ` ${err.type}` : ""}${
        err.message ? `: ${err.message}` : ""
      }`,
    );
  }
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${op} returned ${res.status} with a non-JSON body.`);
  }
}

/** SES answers PascalCase JSON; every action returns the same members with a lowercase first letter. */
export function camelKeys<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) return value.map((v) => camelKeys(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k.charAt(0).toLowerCase() + k.slice(1)] = camelKeys(v);
    }
    return out as T;
  }
  return value as T;
}

/** `{a: "b"}` or `[{Name, Value}]` / `[{name, value}]` -> SES `EmailTags`. */
export function toTags(value: unknown): Array<{ Name: string; Value: string }> | undefined {
  const parsed = toJson<unknown>(value, "Tags");
  if (parsed === undefined) return undefined;
  if (Array.isArray(parsed)) {
    return parsed.map((t) => {
      const r = t as Record<string, unknown>;
      return { Name: String(r.Name ?? r.name), Value: String(r.Value ?? r.value) };
    });
  }
  return Object.entries(parsed as Record<string, unknown>).map(([Name, v]) => ({
    Name,
    Value: String(v),
  }));
}

/** Template data is a JSON STRING on the wire (max 262,144 bytes). */
export function templateData(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
}
