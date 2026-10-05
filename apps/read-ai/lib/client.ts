import type { HookContext } from "@w6w/types";

/**
 * Read AI REST API client.
 *
 * Verified 2026-10-05 against Read AI's help-center API Reference and
 * "API Keys & Authentication" articles (open beta), plus unauthenticated probes
 * of `api.read.ai`. There is no OpenAPI document; the three endpoints below are
 * the whole documented surface.
 *
 * ## Errors have two shapes
 *
 * A request with NO `Authorization` header answers `401 {"detail":"Not authenticated"}`
 * (a bare string). A request with a bad token answers
 * `401 {"detail":{"error":"invalid_token","error_description":"…","hint":"…"}}`
 * (an object). {@link formatReadAiError} reads both.
 *
 * ## Pagination is a cursor equal to the last item's id
 *
 * `limit` defaults to 10 and its maximum is also 10. `cursor` is the `id` of the
 * last meeting on the previous page; `has_more` says whether to continue.
 *
 * ## Rate limit
 *
 * 100 requests per minute per user, answered with `429`. No rate-limit header is
 * documented.
 */
export const API_BASE = "https://api.read.ai";

/** The eight documented `expand[]` values for a finished meeting. */
export const EXPAND_FIELDS = [
  "summary",
  "chapter_summaries",
  "action_items",
  "key_questions",
  "topics",
  "transcript",
  "metrics",
  "recording_download",
] as const;

/** Only these two are available on `/live`. */
export const LIVE_EXPAND_FIELDS = ["transcript", "chapter_summaries"] as const;

export type QueryValue = string | number | boolean | undefined | null;

/**
 * Build a query string, writing arrays as the vendor documents them
 * (`expand[]=a&expand[]=b`, literal brackets).
 */
export function buildQuery(query: Record<string, QueryValue | QueryValue[]>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === "") continue;
        parts.push(`${key}[]=${encodeURIComponent(String(item))}`);
      }
    } else if (value !== undefined && value !== null && value !== "") {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

interface ErrorBody {
  detail?: string | { error?: string; error_description?: string; hint?: string };
  message?: string;
}

/** Turn a failed response into a message naming the vendor's own error code. */
export async function formatReadAiError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null) as ErrorBody | null;
  const detail = body?.detail;
  if (typeof detail === "string") return `Read AI ${res.status}: ${detail}`;
  if (detail && typeof detail === "object") {
    const code = detail.error ?? "error";
    const text = detail.error_description ? `: ${detail.error_description}` : "";
    const hint = detail.hint ? ` (${detail.hint})` : "";
    return `Read AI ${res.status} ${code}${text}${hint}`;
  }
  if (body?.message) return `Read AI ${res.status}: ${body.message}`;
  return `Read AI ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`;
}

export class ReadAiClient {
  constructor(private readonly ctx: HookContext) {}

  /** GET a JSON resource. No credential here: `sign` adds the bearer token. */
  async get<T = unknown>(
    path: string,
    query: Record<string, QueryValue | QueryValue[]> = {},
  ): Promise<T> {
    const res = await this.ctx.fetch(`${API_BASE}${path}${buildQuery(query)}`, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(await formatReadAiError(res));
    return await res.json() as T;
  }
}

/** Pick the supplied subset of `allowed` from a user-supplied list. */
export function pickExpand(
  value: unknown,
  allowed: readonly string[],
): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter((v) => allowed.includes(v));
}

/** The four documented `start_time_ms.*` bounds, keyed by input param name. */
export const TIME_BOUNDS = {
  startTimeMsGt: "start_time_ms.gt",
  startTimeMsGte: "start_time_ms.gte",
  startTimeMsLt: "start_time_ms.lt",
  startTimeMsLte: "start_time_ms.lte",
} as const;

/** Only the supplied bounds, under the vendor's dotted names. */
export function timeFilters(
  input: Partial<Record<keyof typeof TIME_BOUNDS, number | string | null>>,
  allowed: readonly (keyof typeof TIME_BOUNDS)[] = Object.keys(
    TIME_BOUNDS,
  ) as (keyof typeof TIME_BOUNDS)[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of allowed) {
    const raw = input[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error(`${key} must be a number of milliseconds`);
    out[TIME_BOUNDS[key]] = n;
  }
  return out;
}
