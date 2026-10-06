import type { HookContext } from "@w6w/types";

/**
 * Inoreader developer API — `https://www.inoreader.com/reader/api/0`.
 *
 * Source: the developer portal at https://www.inoreader.com/developers/ (every method page
 * fetched 2026-10-06), cross-checked with live unauthenticated probes the same day.
 *
 * ## Wire facts that are easy to get wrong
 *
 * - **Plain text, not JSON, for every write.** `edit-tag`, `rename-tag`, `disable-tag`,
 *   `mark-all-as-read`, `subscription/edit` and `preference/stream/set` answer the literal
 *   body `OK`. Only `subscription/quickadd` answers JSON on a POST ("Unlike most other POST
 *   methods, this one returns a JSON object"). {@link InoreaderClient.ok} therefore judges a
 *   write by its BODY, never by `res.ok`.
 * - **Errors can be `Error=<message>`** (Error handling page), also plain text.
 * - **Parameters ride on the query string**, exactly as the vendor's own examples show
 *   (`edit-tag?a=…&i=12345678&i=12345679`) — including for POST. `i` repeats once per item.
 * - **OAuth needs no AppId/AppKey.** The App authentication page: "App authentication is only
 *   needed when using ClientLogin". A bearer token alone is enough; an unsigned call is what
 *   answers `403 AppId required!`.
 * - **Two daily quota zones**, reported on every response in `X-Reader-Zone{1,2}-{Limit,Usage}`
 *   and `X-Reader-Limits-Reset-After` (seconds). Zone 1 is reads, zone 2 is writes; a 429 means
 *   the zone being called is spent. The Pro default is only 100 requests/day per zone.
 * - **Stream ids go in the PATH** of `stream/contents/{streamId}` and must be URL-encoded
 *   (the `/` inside `feed/http://…` included).
 */

export const API_BASE = "https://www.inoreader.com/reader/api/0";

/** System tags and streams (Stream IDs / Edit tag pages). `-` stands for the caller's user id. */
export const TAG_READ = "user/-/state/com.google/read";
export const TAG_STARRED = "user/-/state/com.google/starred";
export const TAG_BROADCAST = "user/-/state/com.google/broadcast";
export const TAG_LIKE = "user/-/state/com.google/like";

export type QueryValue = string | number | boolean | undefined | null | Array<string | number>;
export type Query = Record<string, QueryValue>;

export interface RequestOptions {
  method?: "GET" | "POST";
  query?: Query;
}

/** Build the query string, dropping unset values and repeating array entries (`i=1&i=2`). */
export function buildSearch(query: Query): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, String(v));
    } else {
      params.set(key, String(value));
    }
  }
  return params;
}

/** Strip the vendor's `Error=` prefix and cap the length so a stray HTML page cannot flood logs. */
export function errorText(raw: string): string {
  const trimmed = raw.trim().replace(/^Error=/i, "");
  if (/^\s*<(!doctype|html)/i.test(trimmed)) return "(HTML error page)";
  return trimmed.length > 300 ? `${trimmed.slice(0, 300)}… (truncated)` : trimmed;
}

/** One line per failure, with the vendor's own wording and what to do about it. */
export function formatError(status: number, method: string, path: string, raw: string): string {
  const detail = errorText(raw);
  const base = `Inoreader ${status} for ${method} ${path}`;
  switch (status) {
    case 401:
      return `${base}: ${detail || "not authorized"} — the access token is invalid or revoked; ` +
        "reconnect the account";
    case 403:
      return `${base}: ${detail || "forbidden"} — the application credentials were refused, ` +
        "or the method is not available to this plan";
    case 429:
      return `${base}: daily limit reached for this API zone (zone 1 = reads, zone 2 = writes); ` +
        "it resets within 24 hours";
    case 400:
      return `${base}: ${detail || "mandatory parameter(s) missing"}`;
    default:
      return `${base}: ${detail || "(empty body)"}`;
  }
}

export interface ZoneUsage {
  zone1Limit?: number;
  zone2Limit?: number;
  zone1Usage?: number;
  zone2Usage?: number;
  resetAfterSeconds?: number;
}

/** The five documented rate-limit response headers. */
export function readZoneUsage(headers: Headers): ZoneUsage {
  const num = (name: string): number | undefined => {
    const raw = headers.get(name);
    if (raw === null || raw.trim() === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    zone1Limit: num("x-reader-zone1-limit"),
    zone2Limit: num("x-reader-zone2-limit"),
    zone1Usage: num("x-reader-zone1-usage"),
    zone2Usage: num("x-reader-zone2-usage"),
    resetAfterSeconds: num("x-reader-limits-reset-after"),
  };
}

export class InoreaderClient {
  constructor(private ctx: HookContext) {}

  /** A method that answers JSON (every read, plus `subscription/quickadd`). */
  async json<T = Record<string, unknown>>(path: string, options: RequestOptions = {}): Promise<T> {
    const { text } = await this.send(path, options);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(
        `Inoreader answered ${options.method ?? "GET"} ${path} with a non-JSON body: ` +
          errorText(text),
      );
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`Inoreader answered ${path} with JSON that is not an object`);
    }
    return parsed as T;
  }

  /** A write that answers the literal body `OK`. Anything else — even on HTTP 200 — is a failure. */
  async ok(path: string, options: RequestOptions = {}): Promise<void> {
    const { text } = await this.send(path, { method: "POST", ...options });
    if (text.trim() !== "OK") {
      throw new Error(`Inoreader did not confirm ${path}: ${errorText(text) || "(empty body)"}`);
    }
  }

  private async send(path: string, options: RequestOptions): Promise<{ text: string }> {
    const method = options.method ?? "GET";
    const search = buildSearch(options.query ?? {}).toString();
    const url = `${API_BASE}${path}${search ? `?${search}` : ""}`;
    const res = await this.ctx.fetch(url, { method, headers: { accept: "application/json" } });
    const text = await res.text();
    if (!res.ok) throw new Error(formatError(res.status, method, path, text));
    if (/^\s*Error=/i.test(text)) throw new Error(formatError(res.status, method, path, text));
    return { text };
  }
}

/** Percent-encode a stream id for use as a path segment (`/` becomes `%2F`). */
export function streamPath(streamId: string): string {
  return encodeURIComponent(streamId);
}

/** Split a comma/newline separated list of item ids into trimmed, non-empty entries. */
export function splitIds(raw: string | undefined): string[] {
  return (raw ?? "").split(/[\s,]+/).map((s) => s.trim()).filter((s) => s.length > 0);
}
