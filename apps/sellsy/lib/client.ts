import type { HookContext } from "@w6w/types";

/**
 * Sellsy API v2 base URL (`servers[0].url` of the published OpenAPI document,
 * verified 2026-10-06 against api.sellsy.com/doc/v2/dist/sellsy.v2.latest.yaml,
 * v2.303.0). The OAuth host `login.sellsy.com` is a different host, used only
 * by the auth hooks.
 */
export const API_URL = "https://api.sellsy.com/v2";
export const TOKEN_URL = "https://login.sellsy.com/oauth2/access-tokens";

export type Query = Record<string, string | number | boolean | string[] | undefined | null>;

/**
 * Sellsy answers every failure with `{"error": {"code", "message", "context",
 * "details"}}`. The vendor's own message and `details` (per-field validation
 * errors) are far more useful than the HTTP status, so both go into the thrown
 * message.
 */
export class SellsyError extends Error {
  status: number;
  context?: string;
  constructor(status: number, message: string, context?: string) {
    super(message);
    this.name = "SellsyError";
    this.status = status;
    this.context = context;
  }
}

/** Reads the vendor's error envelope out of a response body (best effort). */
export function describeError(
  status: number,
  body: unknown,
): { message: string; context?: string } {
  const err = (body as { error?: Record<string, unknown> } | null)?.error;
  if (!err || typeof err !== "object") return { message: `Sellsy returned HTTP ${status}` };
  const parts = [String(err.message ?? `HTTP ${status}`)];
  const details = err.details;
  if (details && typeof details === "object") {
    const fields = Object.entries(details as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
    if (fields.length) parts.push(`(${fields.join("; ")})`);
  }
  const context = typeof err.context === "string" ? err.context : undefined;
  let message = `Sellsy: ${parts.join(" ")}`;
  if (status === 429) {
    message +=
      " — request quota reached; check the X-Quota-Remaining-By-* headers or the quota action";
  } else if (status === 403) {
    message += " — the OAuth client is probably missing the scope this action needs";
  }
  return { message, context };
}

/**
 * Array parameters on Sellsy are PHP-style: `embed[]=a&embed[]=b`
 * (the OpenAPI examples use exactly this form). Everything else is scalar.
 */
export function buildQuery(query: Query = {}): string {
  const out: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const v of value) out.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(v)}`);
    } else {
      out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return out.length ? `?${out.join("&")}` : "";
}

export interface CallOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Query;
  body?: unknown;
}

/**
 * One call to the API. No credential here — the Auth `sign` hook stamps it.
 * A `204` (every DELETE, and the `PUT` of contacts/companies) resolves to
 * `null`.
 */
export async function call(
  ctx: HookContext,
  path: string,
  { method = "GET", query, body }: CallOptions = {},
): Promise<unknown> {
  const headers: Record<string, string> = { accept: "application/json" };
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await ctx.fetch(`${API_URL}${path}${buildQuery(query)}`, init);
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  if (!res.ok) {
    const { message, context } = describeError(res.status, parsed);
    throw new SellsyError(res.status, message, context);
  }
  return parsed;
}

/** `/companies/{id}` path segment, encoded. */
export const seg = (v: unknown): string => encodeURIComponent(String(v));
