import type { HookContext } from "@w6w/types";

/**
 * Gladia REST client.
 *
 * Verified 2026-10-06 against the vendor's OpenAPI document (`api.gladia.io/openapi.json`,
 * "Gladia Control API" 1.0), the docs index (`docs.gladia.io/llms.txt`) and live probes.
 *
 * ## Pre-recorded is `/v2/pre-recorded`, NOT `/v2/transcription`
 *
 * The OpenAPI document still lists `/v2/transcription*` (same schemas, same behaviour), but
 * every one of those pages is marked "(Deprecated) Prefer the more specific pre-recorded
 * endpoint" in the docs. `/v1` pre-recorded is deprecated too (the connection-held-open
 * style). This app builds against `/v2/pre-recorded*` only.
 *
 * ## Errors
 *
 * `{"statusCode","timestamp","path","message","request_id"}`. `message` is a string for
 * auth errors; it is surfaced verbatim, together with `request_id` (the id support asks for).
 */
export const API_BASE = "https://api.gladia.io";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export interface GladiaErrorBody {
  statusCode?: number;
  message?: unknown;
  request_id?: string;
}

export function truncate(text: string, max = 800): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** The vendor's own message plus its `request_id`, one actionable line. */
export function formatGladiaError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: GladiaErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as GladiaErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const message = parsed?.message === undefined
    ? undefined
    : typeof parsed.message === "string"
    ? parsed.message
    : JSON.stringify(parsed.message);
  const parts = [
    `Gladia ${status} for ${method} ${path}`,
    message ?? (raw ? truncate(raw) : undefined),
    parsed?.request_id ? `(request_id ${parsed.request_id})` : undefined,
    status === 429
      ? "concurrency or request-rate limit hit — back off and retry; do not resubmit a job " +
        "that was already accepted"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

/** Split a comma/newline separated string (or pass an array through) into trimmed entries. */
export function toList(v: string[] | string | undefined | null): string[] {
  if (v === undefined || v === null || v === "") return [];
  return (Array.isArray(v) ? v : v.split(/[,\n]/))
    .map((s) => String(s).trim())
    .filter(Boolean);
}

export class GladiaClient {
  constructor(private ctx: HookContext) {}

  /** Parse a JSON response body. The body IS the resource — nothing to unwrap. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Array filters are the OpenAPI default (form, explode): `status=done&status=error`.
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, item); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatGladiaError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
