/**
 * Microsoft Graph client — the whole vendor surface this App talks to.
 *
 * Everything here was checked against the Microsoft Graph **v1.0** reference:
 * https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview?view=graph-rest-1.0
 *
 * Four Graph-specific things this file exists to absorb:
 *
 *  1. **The OData envelope.** Collections come back as `{ "value": [...] }`,
 *     never as a bare array, and the continuation cursor is `@odata.nextLink` —
 *     an *absolute URL* that already carries every query parameter from the
 *     original request. Graph's own paging guidance is that you replay that URL
 *     verbatim rather than reconstruct it from `$skip`
 *     (https://learn.microsoft.com/en-us/graph/paging).
 *
 *  2. **Teams ids are not URL-safe.** A channel id looks like
 *     `19:4a95f7d8db4c4e7fae857bcebe0623e6@thread.tacv2` and a chat id like
 *     `19:…@unq.gbl.spaces`. Both contain `:` and `@`, so every id is
 *     percent-encoded before it becomes a path segment — the form Microsoft's
 *     own `channel-list-members` example uses
 *     (`…/channels/19%3A20bc…%40thread.skype/members`).
 *
 *  3. **Small, hard page caps.** Unlike mail, the Teams message collections cap
 *     `$top` at **50** (channel messages, replies, chat messages, chats), so a
 *     "give me everything" run has to walk `@odata.nextLink` rather than ask for
 *     a big page. `collect()` does that, bounded.
 *
 *  4. **Bodies are `text` or `html`, lowercase.** `chatMessage.body` is an
 *     `itemBody`, and every v1.0 Teams example spells the discriminator in
 *     lowercase (`"contentType": "html"`).
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
  /** Extra request headers (e.g. `Prefer: include-unknown-enum-members`). */
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
   * Bounded on purpose: a channel's history is unbounded, an action's runtime is
   * not, and a silent infinite walk is the failure mode this replaces. When the
   * cap is hit the surviving `nextLink` is returned so the caller can resume.
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

/** Graph's `itemBody` type as the Teams endpoints spell it: lowercase. */
export interface ItemBody {
  contentType: "text" | "html";
  content: string;
}

/**
 * Build a `chatMessage.body`.
 *
 * Defaults to `html` because that is what Graph itself returns for anything
 * richer than a bare string, and because `<at>` mentions and links only render
 * under `html`.
 */
export function itemBody(content: string, contentType?: string): ItemBody {
  return {
    contentType: contentType?.toLowerCase() === "text" ? "text" : "html",
    content,
  };
}

/**
 * Percent-encode one path segment.
 *
 * Team ids are plain GUIDs, but channel ids (`19:…@thread.tacv2`) and chat ids
 * (`19:…@unq.gbl.spaces`) are not URL-safe. Encoding every segment uniformly is
 * cheaper than remembering which ones need it.
 */
export function seg(value: string): string {
  return encodeURIComponent((value ?? "").trim());
}

/**
 * Prefix a *local* validation failure so it is legible as ours rather than as
 * Graph's. Errors raised before a request is made read identically to remote
 * ones otherwise, and the difference matters when you are debugging a run.
 */
export function teamsError(message: string): string {
  return `Microsoft Teams: ${message}`;
}

/** Join a repeated param into the comma-separated form OData expects. */
export function odataList(values?: string[]): string | undefined {
  const joined = (values ?? []).map((v) => (v ?? "").trim()).filter(Boolean).join(",");
  return joined || undefined;
}

/** Drop `undefined` entries so a request body only carries what the caller set. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}
