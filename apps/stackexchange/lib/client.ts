import type { HookContext } from "@w6w/types";

/**
 * Stack Exchange API client (v2.3).
 *
 * Verified 2026-10-06 against api.stackexchange.com/docs (one page per method) and live,
 * unauthenticated probes of every path used here.
 *
 * - One host, `api.stackexchange.com`, for the whole network; the community is chosen per call
 *   with the `site` query parameter (`stackoverflow`, `serverfault`, `superuser`, ...).
 * - HTTP is always GET and read-only. The application `key` rides in the query string and is added
 *   by `auth/api-key.ts` `sign`, never here.
 * - Every response is the common wrapper object: `items`, `has_more`, `quota_max`,
 *   `quota_remaining`, optionally `backoff`, `total`. The API compresses every response; the
 *   runtime's fetch decodes it.
 * - Every error, whatever the cause, is HTTP 400 (or the numeric `error_id` in a JSONP 200) with
 *   `error_id`, `error_name`, `error_message` in the body, so failures are classified from the
 *   body, not from the status.
 * - `backoff` (seconds) means: do not call the same method again before that long. It is surfaced
 *   on every result so the workflow can wait; this client does not sleep.
 */

export const API_BASE = "https://api.stackexchange.com/2.3";

/** Percent-encode one path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/**
 * A `{ids}` / `{tags}` path segment. The API wants `;`-delimited values (up to 100); accept an
 * array or a `,`/`;`/newline separated string and normalise. The `;` stays literal in the path.
 */
export function idList(value: unknown): string {
  const items = (Array.isArray(value) ? value.map(String) : String(value ?? "").split(/[,;\n]/))
    .map((s) => s.trim())
    .filter((s) => s !== "");
  return items.map(seg).join(";");
}

/** A `tagged` / `nottagged` query value: `;`-delimited. */
export function tagList(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const text = (Array.isArray(value) ? value.map(String) : String(value).split(/[,;\n]/))
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .join(";");
  return text === "" ? undefined : text;
}

/** Unix seconds from a number, a numeric string, or an ISO 8601 date. Undefined when unset. */
export function toUnix(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return Math.trunc(value);
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return Number(text);
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
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

/** The query parameters every list method shares. */
export interface CommonInput {
  site?: string;
  page?: number;
  pageSize?: number;
  order?: string;
  sort?: string;
  min?: string | number;
  max?: string | number;
  fromDate?: string | number;
  toDate?: string | number;
  filter?: string;
}

export function commonQuery(input: CommonInput, withSite = true): Query {
  return {
    site: withSite ? input.site || "stackoverflow" : undefined,
    page: input.page,
    pagesize: input.pageSize,
    order: input.order,
    sort: input.sort,
    min: input.min,
    max: input.max,
    fromdate: toUnix(input.fromDate),
    todate: toUnix(input.toDate),
    filter: input.filter,
  };
}

/** One human line from a parsed error body. */
export function errorText(body: unknown, raw = ""): string {
  const e = body as { error_name?: unknown; error_message?: unknown } | null;
  const name = typeof e?.error_name === "string" ? e.error_name : "";
  const message = typeof e?.error_message === "string" ? e.error_message : "";
  if (name || message) return [name, message].filter(Boolean).join(": ");
  return raw.trim().slice(0, 200);
}

/** True when the body is the API's own error object. */
export function isApiError(body: unknown): boolean {
  return typeof (body as { error_id?: unknown } | null)?.error_id === "number";
}

export interface Wrapper {
  items?: unknown[];
  has_more?: boolean;
  quota_max?: number;
  quota_remaining?: number;
  backoff?: number;
  total?: number;
  page?: number;
  page_size?: number;
}

/** The common result every action returns, from the wrapper object. */
export function wrapperResult(body: Wrapper) {
  const items = Array.isArray(body.items) ? body.items : [];
  return {
    items,
    count: items.length,
    hasMore: body.has_more === true,
    quotaRemaining: typeof body.quota_remaining === "number" ? body.quota_remaining : null,
    quotaMax: typeof body.quota_max === "number" ? body.quota_max : null,
    backoff: typeof body.backoff === "number" ? body.backoff : null,
    total: typeof body.total === "number" ? body.total : null,
  };
}

export class StackExchangeClient {
  constructor(private readonly ctx: HookContext) {}

  /** GET a method and return the parsed wrapper; throws the API's own error text on failure. */
  async get(path: string, query?: Query): Promise<Wrapper> {
    const res = await this.ctx.fetch(`${API_BASE}${path}${buildQuery(query)}`, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch { /* non-JSON body: reported below */ }
    }
    if (!res.ok || isApiError(parsed)) {
      const backoff = (parsed as Wrapper | undefined)?.backoff;
      throw new Error(
        `Stack Exchange GET ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}${
          typeof backoff === "number" ? ` (backoff ${backoff}s)` : ""
        }`,
      );
    }
    return (parsed ?? {}) as Wrapper;
  }
}
