/**
 * Microsoft Graph client — the whole vendor surface this App talks to.
 *
 * Everything here was checked against the Microsoft Graph v1.0 reference:
 * https://learn.microsoft.com/en-us/graph/api/overview?view=graph-rest-1.0
 *
 * Two Graph-specific things this file exists to absorb:
 *
 *  1. **The OData envelope.** Collections come back as `{ "value": [...] }`,
 *     never as a bare array, and the continuation cursor is `@odata.nextLink` —
 *     an *absolute URL* that already carries every query parameter from the
 *     original request. Graph's own docs are explicit that you must replay that
 *     URL verbatim rather than reconstruct it from `$skip`
 *     (https://learn.microsoft.com/en-us/graph/paging).
 *
 *  2. **Empty successful bodies.** Graph answers `202 Accepted` for the
 *     fire-and-forget actions (`sendMail`, `reply`, `forward`, `send`) and
 *     `204 No Content` for deletes. Calling `res.json()` on those throws, so
 *     they route through `status()` instead of `request()`.
 */
import type { HookContext } from "@w6w/types";

/** Graph's stable production endpoint. `beta` is deliberately not used. */
export const API_URL = "https://graph.microsoft.com/v1.0";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Query parameters. OData names (`$select`, `$top`, …) are passed through verbatim. */
  query?: Record<string, QueryValue>;
  /** JSON object → JSON-encoded body. `undefined` → no body at all. */
  body?: unknown;
  /** Extra request headers (e.g. the `Prefer:` family). */
  headers?: Record<string, string>;
}

/** The shape of every Graph collection response. */
export interface GraphList<T> {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.count"?: number;
}

/** What the list actions return: one or more pages, plus the cursor to continue. */
export interface PagedResult<T> {
  value: T[];
  /**
   * Present when Graph has more results. Feed it back as the `nextLink` param
   * on the next call — it is a complete URL, not an opaque token.
   */
  nextLink?: string;
  /** How many HTTP requests were actually made. */
  pages: number;
}

/** Graph's error envelope: `{ "error": { "code": "...", "message": "..." } }`. */
interface GraphError {
  error?: { code?: string; message?: string };
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * Note there is no `Authorization` header anywhere in this file: the runtime
 * routes every request through the Auth `sign` hook, which is the only code
 * handed the credential.
 */
export class GraphClient {
  constructor(private ctx: HookContext) {}

  /** Build an absolute URL. A path already starting with `http` is used as-is
   * (that is how `@odata.nextLink` is replayed). */
  private url(path: string, query?: Record<string, QueryValue>): URL {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url;
  }

  private async fire(path: string, options: RequestOptions): Promise<Response> {
    const url = this.url(path, options.query);
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const method = options.method ?? "GET";
    const res = await this.ctx.fetch(url.toString(), { method, headers, body });
    if (!res.ok) throw new Error(await describeFailure(res, method, url));
    return res;
  }

  /** Perform a request and decode the JSON body. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.fire(path, options);
    // 202/204 carry no body by contract; anything else that fails to parse is
    // treated the same rather than masking a real response as an error.
    if (res.status === 202 || res.status === 204) return undefined as T;
    return await res.json().catch(() => undefined) as T;
  }

  /**
   * Perform a request whose only meaningful result is "the service accepted
   * it" — Graph's `202 Accepted` and `204 No Content` endpoints.
   */
  async status(path: string, options: RequestOptions = {}): Promise<{ status: number }> {
    const res = await this.fire(path, options);
    return { status: res.status };
  }

  /** Fetch exactly one page of a collection. */
  async page<T>(path: string, options: RequestOptions = {}): Promise<PagedResult<T>> {
    const body = await this.request<GraphList<T>>(path, options);
    return {
      value: body?.value ?? [],
      nextLink: body?.["@odata.nextLink"],
      pages: 1,
    };
  }

  /**
   * Walk `@odata.nextLink` up to `maxPages` requests.
   *
   * Bounded on purpose: a mailbox is unbounded, an action's runtime is not, and
   * a silent infinite walk is the failure mode this replaces. When the cap is
   * hit the surviving `nextLink` is returned so the caller can resume.
   */
  async collect<T>(
    path: string,
    options: RequestOptions = {},
    maxPages = 10,
  ): Promise<PagedResult<T>> {
    const limit = Math.max(1, Math.floor(maxPages));
    const value: T[] = [];
    let cursor: string | undefined;
    let pages = 0;

    for (;;) {
      // Only the first request carries `query`; a nextLink already embeds it.
      const body = cursor
        ? await this.request<GraphList<T>>(cursor, { headers: options.headers })
        : await this.request<GraphList<T>>(path, options);
      pages++;
      value.push(...(body?.value ?? []));
      cursor = body?.["@odata.nextLink"];
      if (!cursor || pages >= limit) break;
    }

    return { value, nextLink: cursor, pages };
  }
}

/** Surface Graph's `error.code` / `error.message` when it sends one. */
async function describeFailure(res: Response, method: string, url: URL): Promise<string> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as GraphError;
      const code = parsed.error?.code;
      const message = parsed.error?.message;
      detail = [code, message].filter(Boolean).join(": ") || text;
    } catch {
      detail = text;
    }
  } catch { /* body already consumed or unreadable */ }
  return `Microsoft Graph ${res.status} ${res.statusText} for ${method} ${url.pathname}: ${detail}`;
}

// --------------------------------------------------------------- resources --

/** Graph's `recipient` type: `{ emailAddress: { address, name? } }`. */
export interface Recipient {
  emailAddress: { address: string; name?: string };
}

/** Graph's `itemBody` type. `contentType` is `"Text"` or `"HTML"`. */
export interface ItemBody {
  contentType: "Text" | "HTML";
  content: string;
}

/** Graph's `dateTimeTimeZone` type. `dateTime` has NO trailing `Z` or offset. */
export interface DateTimeTimeZone {
  dateTime: string;
  timeZone?: string;
}

/**
 * Turn a list of bare addresses into Graph recipients.
 *
 * Accepts `"Alice <alice@example.com>"` as well as a bare address, because that
 * is what a user pastes. Returns `undefined` for an empty list so the caller can
 * omit the property entirely rather than send `[]` — Graph treats an explicit
 * empty `toRecipients` on a PATCH as "clear the recipients".
 */
export function toRecipients(addresses?: string[]): Recipient[] | undefined {
  if (!addresses?.length) return undefined;
  const out: Recipient[] = [];
  for (const raw of addresses) {
    const entry = (raw ?? "").trim();
    if (!entry) continue;
    const match = entry.match(/^(.*?)\s*<\s*([^>]+?)\s*>$/);
    out.push(
      match
        ? { emailAddress: { address: match[2], name: match[1] || undefined } }
        : { emailAddress: { address: entry } },
    );
  }
  return out.length ? out : undefined;
}

/** Build an `itemBody`, or `undefined` when there is no content to send. */
export function itemBody(content?: string, contentType?: string): ItemBody | undefined {
  if (content === undefined || content === null) return undefined;
  return {
    contentType: contentType?.toUpperCase() === "TEXT" ? "Text" : "HTML",
    content,
  };
}

/**
 * Build a `dateTimeTimeZone`.
 *
 * Graph wants a *naive* local timestamp plus a separate `timeZone` name; a
 * trailing `Z` or `+02:00` in `dateTime` is rejected or silently misread, and a
 * `datetime` form field commonly produces one. Strip it and let `timeZone`
 * carry the meaning (defaulting to UTC, which is Graph's own default).
 */
export function dateTimeTimeZone(value: string, timeZone?: string): DateTimeTimeZone {
  const trimmed = value.trim();
  const naive = trimmed.replace(/(?:Z|[+-]\d{2}:?\d{2})$/i, "");
  return { dateTime: naive, timeZone: timeZone || "UTC" };
}

/**
 * Wrap a `$search` term in the double quotes Graph's KQL syntax requires
 * (`$search="subject:report"`), unless the caller already quoted it.
 * https://learn.microsoft.com/en-us/graph/search-query-parameter
 */
export function searchTerm(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^".*"$/.test(trimmed) ? trimmed : `"${trimmed.replaceAll('"', '\\"')}"`;
}

/** Join a repeated param into the comma-separated form OData expects. */
export function odataList(values?: string[]): string | undefined {
  const joined = (values ?? []).map((v) => (v ?? "").trim()).filter(Boolean).join(",");
  return joined || undefined;
}

/**
 * The `Prefer` headers the Outlook endpoints honour.
 *
 * - `outlook.body-content-type` — `"text"` or `"html"`; without it Graph always
 *   returns bodies as HTML.
 * - `outlook.timezone` — the time zone `start`/`end` are rendered in; without it
 *   Graph answers in UTC.
 *
 * Both take a *quoted* value on the wire, per the reference examples.
 */
export function preferHeaders(
  opts: { bodyContentType?: string; timeZone?: string } = {},
): Record<string, string> | undefined {
  const prefs: string[] = [];
  if (opts.bodyContentType) prefs.push(`outlook.body-content-type="${opts.bodyContentType}"`);
  if (opts.timeZone) prefs.push(`outlook.timezone="${opts.timeZone}"`);
  return prefs.length ? { prefer: prefs.join(", ") } : undefined;
}

/** Drop `undefined` entries so a PATCH only ever touches what the caller set. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}
