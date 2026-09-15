import type { HookContext } from "@w6w/types";

/**
 * Shortcut REST API v3 client.
 *
 * Verified 2026-09-15 against Shortcut's own machine-readable OpenAPI 3.0
 * document (`developer.shortcut.com/api/rest/v3/shortcut.openapi.json`,
 * 568,325 bytes, `info.title` "Shortcut API 3.0"), the same page's rendered
 * HTML reference, and live probes against `api.app.shortcut.com`. Nothing
 * came from a third-party integration directory.
 *
 * ## One host, one prefix, one shape
 *
 * The OpenAPI document declares exactly one server, `https://api.app.shortcut.com`,
 * and every path carries the `/api/v3` prefix. Unlike some vendors in this pack,
 * **every response is the resource JSON directly** — there is no `{"data": …}`
 * envelope to unwrap, and list endpoints answer a bare JSON array rather than a
 * paged envelope (the two exceptions, `GET /epics/paginated` and the two `/search*`
 * families, are documented at their call sites).
 *
 * ## Two id spaces, and getting them backwards 404s silently
 *
 * Stories, Epics, Iterations, Labels, Projects and Workflows are all addressed by
 * a plain **integer** (`format: int64`) — Shortcut's legacy numeric id space.
 * Members are addressed by **UUID** instead, and a Project's `team_id` (the
 * legacy field name for what Shortcut's UI now calls a "Group") is *also* an
 * integer, distinct from the `group_id` **UUID** that Stories, Epics and
 * Iterations use to reference the same Group. Pasting a UUID where an integer id
 * is expected (or vice versa) is rejected by the API as a schema mismatch
 * (`400`), not silently coerced.
 *
 * ## Errors
 *
 * Every failure observed on the wire is `{"message": "...", "tag": "..."}` with
 * a 4xx/5xx status — confirmed live on 2026-09-15: an unauthenticated request
 * answers `401 {"message":"Sorry, the organization context for this request is
 * missing...","tag":"organization2_missing"}`, and a syntactically-plausible but
 * wrong token answers `401 {"message":"Unauthorized","tag":"unauthorized"}`. The
 * OpenAPI document itself only documents the 4xx status codes and a bare
 * `description` string for most operations, not a response schema, so this
 * client parses defensively and falls back to the raw body when `message` is
 * absent.
 *
 * ## Rate limits
 *
 * A fixed 200 requests/minute; excess requests answer `429` and are not
 * processed. No `X-RateLimit-*` (or any other quota) header was observed on a
 * live response — see `health/request-rate.ts`.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.app.shortcut.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/api/v3";

export type QueryValue = string | number | boolean | undefined | null | string[] | number[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Sent as `accept`. Defaults to `application/json`. */
  accept?: string;
}

interface ShortcutErrorBody {
  message?: string;
  tag?: string;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: e.g. `archived=false` and `estimate=0` are both
 * meaningful, and silently dropping them would make them impossible to send.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Accept a `json`/`multiselect`-shaped param as either an array or a comma-separated string. */
export function toIntList(v: unknown): number[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = Array.isArray(v) ? v : String(v).split(",");
  const nums = items.map((s) => Number(String(s).trim())).filter((n) => Number.isFinite(n));
  return nums.length ? nums : undefined;
}

export function toStringList(v: unknown): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = Array.isArray(v) ? v : String(v).split(",");
  const strs = items.map((s) => String(s).trim()).filter(Boolean);
  return strs.length ? strs : undefined;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at each call site.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Shortcut's error body into one actionable line.
 *
 * `tag` is kept alongside `message` because it is the stable machine code —
 * `organization2_missing` (no token reached the request) and `unauthorized` (the
 * token itself is wrong) are two different problems with two different fixes,
 * and both were observed live behind a bare `401`.
 */
export function formatShortcutError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ShortcutErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ShortcutErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message && !parsed?.tag) {
    return `Shortcut ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const parts = [
    `Shortcut ${status}${parsed.tag ? ` ${parsed.tag}` : ""} for ${method} ${path}`,
    parsed.message,
    status === 429 ? "Shortcut rate-limits at 200 requests/minute; retry with backoff" : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class ShortcutClient {
  constructor(private ctx: HookContext) {}

  get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.json<T>(path, { method: "GET", query });
  }

  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.json<T>(path, { method: "POST", body });
  }

  put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.json<T>(path, { method: "PUT", body });
  }

  /** Status only — `deleteStory`/`deleteEpic`/… answer `204` with no body. */
  async delete(path: string): Promise<number> {
    const res = await this.send(path, { method: "DELETE" });
    return res.status;
  }

  private async json<T>(path: string, options: RequestOptions): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: options.accept ?? "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatShortcutError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
