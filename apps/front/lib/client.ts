import type { HookContext } from "@w6w/types";

/**
 * Front's **Core API** — verified against the OpenAPI 3.x document Front
 * publishes itself (`frontapp/front-api-specs`, `core-api/core-api.json`, 147
 * paths, fetched 2026-08-18), whose `servers` block states
 * `https://api2.frontapp.com`.
 *
 * Front ships two APIs and this app uses one of them. The **Core API** is the
 * shared inbox: conversations, messages, comments, contacts, tags, teammates.
 * The **Channel API** is the other side of the mirror — it is what a *custom
 * channel provider* implements so Front can hand it outbound messages, and it
 * is a webhook contract rather than something to call. Nothing here touches it.
 */
export const BASE_URL = "https://api2.frontapp.com";

/**
 * A list response's envelope. Front wraps every collection in `_results` with
 * `_pagination.next` beside it, and returns bare objects for single resources.
 */
export interface ListEnvelope<T> {
  _results?: T[];
  _pagination?: { next?: string | null };
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /**
   * Front's `q` filter. Encoded as **bracket notation** — `q[statuses]=open` —
   * with one repeated key per array element, NOT as a JSON string. An array
   * value here becomes several `q[key]=` pairs.
   */
  q?: Record<string, string | number | Array<string | number> | undefined>;
  body?: unknown;
}

/** Drop keys the caller left unset, so an update does not clear untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Split a comma-separated form field into a list, or leave it unset.
 *
 * Front's id-list bodies (`tag_ids`, `teammate_ids`) reject a bare string, and
 * a form field is a string — so every one of them goes through here.
 */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * A Unix timestamp **in seconds** from an ISO date, a bare number, or nothing.
 *
 * Front takes seconds — `due_at`, `scheduled_at`, the `q[after]`/`q[before]`
 * event window — while every date param in this pack's form layer hands over an
 * ISO string. Milliseconds would land the reminder 50,000 years out, which
 * Front rejects with a validation error rather than a hint, so the conversion
 * is done in one place.
 */
export function unixSeconds(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return value;
  const raw = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) throw new Error(`\`${field}\` is not a date or a Unix timestamp: ${raw}`);
  return ms / 1000;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class FrontClient {
  constructor(private ctx: HookContext) {}

  /** Build the URL for a path, applying plain query params and the `q` filter. */
  url(path: string, options: RequestOptions = {}): URL {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    for (const [k, v] of Object.entries(options.q ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Bracket notation, one repeated key per array element:
      //   ?q[statuses]=assigned&q[statuses]=unassigned
      for (const item of Array.isArray(v) ? v : [v]) {
        if (item === undefined || item === null || item === "") continue;
        url.searchParams.append(`q[${k}]`, String(item));
      }
    }
    return url;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return await this.send<T>(this.url(path, options).toString(), options);
  }

  private async send<T>(url: string, options: RequestOptions): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, init);
    if (!res.ok) {
      // Front's errors arrive as `{"_error":{"status","title","message"}}`, and
      // the `message` is the half that names the field. A validation failure
      // adds `_error.details`, which is where the actual reason usually is.
      const text = await res.text().catch(() => "");
      let detail = text;
      try {
        const parsed = JSON.parse(text) as {
          _error?: { title?: string; message?: string; details?: unknown };
        };
        const err = parsed._error;
        if (err) {
          const parts = [err.title, err.message].filter(Boolean).join(": ");
          const details = err.details === undefined ? "" : ` (${JSON.stringify(err.details)})`;
          detail = `${parts}${details}`;
        }
      } catch { /* not JSON — the raw body is the best we have */ }
      throw new Error(
        `Front ${res.status} ${res.statusText} for ${init.method} ${new URL(url).pathname}: ` +
          detail,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Front's cursor paging, collecting `_results`.
   *
   * `_pagination.next` is a **full URL**, and Front builds it against the
   * company's own hostname (`https://yourCompany.api.frontapp.com/...`) rather
   * than the `api2` host the request went to. Following it verbatim would call
   * a host outside this app's egress allowlist — and would do it on a URL Front
   * chose, not one this code did.
   *
   * So only the opaque `page_token` is carried over, and the next page is asked
   * for on the same host and path as the first. The token is what identifies
   * the cursor; the hostname in the link is a convenience for browsers.
   *
   * **Not every collection pages.** Front's spec gives `_pagination` to
   * conversations, contacts, messages and events, but *not* to tags, ticket
   * statuses, inboxes, channels, teammates or comments — those come back whole.
   * The loop then makes exactly one request and the caller's limit is applied
   * by slicing, which is why a limit is honoured either way.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let pageToken: string | undefined;

    while (items.length < wantTotal) {
      const perPage = Math.min(100, Math.max(1, wantTotal - items.length));
      const url = this.url(path, {
        ...options,
        query: { ...options.query, limit: perPage, page_token: pageToken },
      });
      const body = await this.send<ListEnvelope<T>>(url.toString(), options);
      const chunk = body?._results ?? [];
      items.push(...chunk);

      const next = body?._pagination?.next;
      if (!next || chunk.length === 0) break;
      pageToken = tokenFromNext(next);
      if (!pageToken) break;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}

/**
 * Pull the opaque cursor out of a `_pagination.next` link.
 *
 * Returns undefined when the link carries no `page_token` — which stops paging
 * rather than looping on the same page forever.
 */
export function tokenFromNext(next: string): string | undefined {
  try {
    return new URL(next).searchParams.get("page_token") ?? undefined;
  } catch {
    return undefined;
  }
}
