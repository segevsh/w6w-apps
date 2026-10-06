import type { HookContext } from "@w6w/types";

/**
 * AccuLynx v2 REST client.
 *
 * Everything here was verified on 2026-10-06 against AccuLynx's own API reference
 * (https://apidocs.acculynx.com/reference/, a ReadMe site whose server-rendered pages embed the
 * full OpenAPI document, v2.2614.0) plus live unauthenticated probes against
 * `api.acculynx.com`. Nothing came from a third-party integration directory.
 *
 *  - **Base URL** `https://api.acculynx.com/api/v2`. There is no v1; the catalog's old `/api/v1`
 *    link lands on the docs site.
 *  - **Auth** `Authorization: Bearer <API key>` (OpenAPI `securitySchemes.bearerAuth`, http/bearer).
 *    See `auth/bearer-token.ts`.
 *  - **Errors** are RFC 9457 `application/problem+json`
 *    (`{type, title, status, detail, traceId}`); a 429 is `text/plain` with `Retry-After` and
 *    `RateLimit-*` headers; a 416 is `{"message": ...}`. {@link formatError} reads all three.
 *  - **Success shapes** — a list answers `{count, pageSize, pageStartIndex, items}`; a create
 *    answers 201 with a small link body (`{id, _link}` / `{messageId}`) or none at all; an update
 *    answers 204 with no body. {@link AccuLynxClient.send} turns every empty success into
 *    `{ success: true }` so a workflow always gets an object.
 *
 * ## Pagination is spelled two ways
 *
 * Every list response reports `pageStartIndex`, and that is a zero-based RECORD index (not a page
 * number), but the REQUEST parameter that sets it differs per endpoint: most take
 * `recordStartIndex` (jobs, calendars, appointments, lead sources, ...), while contacts, users,
 * estimates, invoices and contact types take `pageStartIndex`. Sending the wrong one is silently
 * ignored and returns page one forever. Actions here expose one `startIndex` input and map it to
 * the documented name per endpoint (`lib/params.ts`).
 */

export const API_BASE = "https://api.acculynx.com/api/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface ProblemBody {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  traceId?: string;
  message?: string;
  errors?: unknown;
}

/** Parse a response body as the vendor's JSON problem shape, or `null` if it is not JSON. */
export function parseProblem(raw: string): ProblemBody | null {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as ProblemBody : null;
  } catch {
    return null;
  }
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Turn a failed response into one actionable line. */
export function formatError(
  status: number,
  method: string,
  path: string,
  raw: string,
  retryAfter?: string | null,
): string {
  const head = `AccuLynx ${status} for ${method} ${path}`;
  const problem = parseProblem(raw);
  if (problem) {
    const parts = [problem.title ?? problem.message];
    if (problem.detail && problem.detail !== problem.title) parts.push(problem.detail);
    if (problem.errors) parts.push(truncate(JSON.stringify(problem.errors), 300));
    const text = parts.filter(Boolean).join(" — ");
    if (text) return `${head}: ${text}${problem.traceId ? ` (traceId ${problem.traceId})` : ""}`;
  }
  const text = raw.trim();
  const retry = status === 429 && retryAfter ? ` (retry after ${retryAfter}s)` : "";
  return text ? `${head}: ${truncate(text)}${retry}` : `${head}${retry}`;
}

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Path-escape a caller-supplied id. */
export function encodeId(id: unknown): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export class AccuLynxClient {
  constructor(private ctx: HookContext) {}

  get<T = Record<string, unknown>>(
    path: string,
    query: Record<string, QueryValue> = {},
  ): Promise<T> {
    return this.send<T>(path, { query });
  }

  async send<T = Record<string, unknown>>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        formatError(
          res.status,
          init.method ?? "GET",
          url.pathname,
          text,
          res.headers.get("retry-after"),
        ),
      );
    }
    // 204 (updates) and body-less 201s (contact notes): report success as an object.
    if (!text.trim()) return { success: true } as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`AccuLynx returned a non-JSON body for ${init.method} ${url.pathname}`);
    }
  }
}

/**
 * Normalise an id-list param: an array, a JSON-array string, or a comma-separated string, to
 * `string[]` with blanks dropped. Empty/absent -> `[]`.
 */
export function toIdList(value: unknown, label: string): string[] {
  if (value === undefined || value === null || value === "") return [];
  let list: unknown = value;
  if (typeof value === "string") {
    const text = value.trim();
    if (text.startsWith("[")) {
      try {
        list = JSON.parse(text);
      } catch {
        throw new Error(`${label} is not valid JSON`);
      }
    } else {
      list = text.split(",");
    }
  }
  if (!Array.isArray(list)) throw new Error(`${label} must be an array of ids`);
  return list.map((v) => String(v).trim()).filter((v) => v !== "");
}
