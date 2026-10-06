import type { HookContext } from "@w6w/types";

/**
 * Lusha public API client.
 *
 * Verified on 2026-10-06 against the OpenAPI document served at `docs.lusha.com/openapi.json`
 * (the v3 surface, `servers: https://api.lusha.com`) and live, unauthenticated probes.
 *
 * ## Auth and errors
 *
 * One fixed host, `api.lusha.com`, and one header, `api_key: <uuid>` (added by `auth/api-key.ts`
 * `sign`, never here). The error body is `{statusCode, message, error}`; a request with no key at
 * all is instead `{statusCode: 401, error: "invalid_request", error_description: "missing
 * Authorization header"}`. A key that is not UUID-shaped is a **400** "Invalid API key format",
 * a well-formed wrong key is a **401** "Invalid API key". Credit exhaustion is 402, rate limits 429.
 *
 * ## Per-item errors
 *
 * Batch endpoints (search / enrich) answer 200 with an `error: {code, message}` on any result
 * they could not resolve (`NOT_FOUND`, `COMPLIANCE_RESTRICTED`, `ENRICH_FAILED`, `NO_SCORE`), so a
 * 200 does not mean every item succeeded. Callers read `results[].error`.
 */
export const API_BASE = "https://api.lusha.com";

/** Percent-encode one path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/** Accept a list as a real array or as the comma-separated text a form field produces. */
export function strList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Accept a JSON value either parsed or as the JSON text a form field produces. Anything
 * unparseable passes through so Lusha, not this app, rejects it.
 */
export function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Build `?a=1&b=2`; unset, null and empty values are skipped. */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** Drop `undefined` values so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** One human line from a parsed error body, covering both of Lusha's error shapes. */
export function errorText(body: unknown, raw = ""): string {
  const e = body as {
    message?: unknown;
    error_description?: unknown;
    error?: unknown;
  } | null;
  if (typeof e?.message === "string" && e.message) return e.message;
  if (Array.isArray(e?.message) && e.message.length > 0) return e.message.join("; ");
  if (typeof e?.error_description === "string" && e.error_description) return e.error_description;
  if (typeof e?.error === "string" && e.error) return e.error;
  return raw.trim().slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

export class LushaClient {
  constructor(private readonly ctx: HookContext) {}

  /** Issue a request and return the parsed JSON body (`{}` for an empty one). */
  async request<T = Record<string, unknown>>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${API_BASE}${path}${buildQuery(options.query)}`;
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch { /* non-JSON body: reported below if the request failed */ }
    }

    if (!res.ok) {
      const hint = res.status === 402
        ? " (out of credits)"
        : res.status === 429
        ? " (rate limited; see the account-usage action for the windows)"
        : "";
      throw new Error(
        `Lusha ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}${hint}`,
      );
    }
    return (parsed ?? {}) as T;
  }
}
