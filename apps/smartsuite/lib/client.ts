import type { HookContext } from "@w6w/types";

export const API_URL = "https://app.smartsuite.com/api/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * SmartSuite's list envelope. `records/list/` and `members/list/` both answer
 * `{ total, offset, limit, items }` — unlike Airtable there is no opaque
 * cursor, so paging is plain `offset` arithmetic.
 */
export interface ListEnvelope<T = unknown> {
  total?: number;
  offset?: number;
  limit?: number;
  items?: T[];
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * Two SmartSuite quirks are handled here rather than in every action:
 *
 *   - **No `Authorization` header.** The runtime routes the request through the
 *     Auth `sign` hook, which stamps `Authorization: Token …` and `ACCOUNT-ID`.
 *     Setting one here would be both a credential leak (the audit rejects it)
 *     and pointless.
 *   - **Errors are often plain text, not JSON.** `GET /solutions/` answers a
 *     bare `Account ID is not specified` string on a missing header, so the
 *     body is read as text first and only then parsed.
 */
export class SmartSuiteClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}/${stripLeadingSlash(path)}`);
    applyQuery(url, options.query);

    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(
        `SmartSuite ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}` +
          (text ? `: ${text}` : ""),
      );
    }
    // 204/empty body: nothing to parse (DELETE answers this way for some rows).
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // A 2xx with a non-JSON body still carries the answer back to the caller.
      return text as unknown as T;
    }
  }
}

/** Percent-encode a single path segment (`solutionId`, `tableId`, `recordId`). */
export function encodeSegment(segment: string): string {
  return encodeURIComponent(segment);
}

function stripLeadingSlash(p: string): string {
  return p.startsWith("/") ? p.slice(1) : p;
}

/**
 * `null`/`undefined`/`""` are skipped so callers can pass optional params
 * through unchanged; everything else is stringified as-is.
 */
function applyQuery(
  url: URL,
  query: Record<string, string | number | boolean | undefined | null> | undefined,
): void {
  if (!query) return;
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
}
