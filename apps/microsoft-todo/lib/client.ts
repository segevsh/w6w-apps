/**
 * Microsoft Graph client for the **To Do** API — the whole vendor surface this
 * App talks to.
 *
 * Everything here was checked against the Microsoft Graph **v1.0** reference on
 * 2026-08-03:
 * https://learn.microsoft.com/en-us/graph/api/resources/todo-overview?view=graph-rest-1.0
 *
 * The To Do resources (`todoTaskList`, `todoTask`, `checklistItem`,
 * `linkedResource`) are all **GA on v1.0**. `beta` is deliberately not used.
 *
 * > The *other* Graph tasks API — `outlookTask` under `/me/outlook/tasks` — is
 * > **dead**, not merely deprecated: Microsoft's own page carries "The Outlook
 * > tasks API is deprecated and **stopped returning data on August 20, 2022**.
 * > Use the To Do API instead." It exists only under `/beta`. Nothing in this
 * > App touches it.
 *
 * Four Graph-specific things this file exists to absorb:
 *
 *  1. **The OData envelope.** Collections come back as `{ "value": [...] }`,
 *     never as a bare array, and the continuation cursor is `@odata.nextLink` —
 *     an *absolute URL* that already carries every query parameter from the
 *     original request. Graph's paging guidance is to replay that URL verbatim
 *     rather than reconstruct it from `$skip`
 *     (https://learn.microsoft.com/en-us/graph/paging).
 *
 *  2. **Delta rounds end with a different cursor.** The `delta` functions answer
 *     with `@odata.nextLink` while a round is still running and with
 *     `@odata.deltaLink` when it has finished. Both are complete URLs with the
 *     state token baked in; a caller stores the `deltaLink` and replays it to
 *     open the next round.
 *
 *  3. **Empty successful bodies.** Every To Do `DELETE` answers `204 No
 *     Content`. Calling `res.json()` on that throws, so deletes route through
 *     `status()` rather than `request()`.
 *
 *  4. **Ids are not URL-safe.** A `todoTaskList` id looks like
 *     `AAMkADIyAAAAABrJAAA=` and a `todoTask` id like
 *     `AAkALgAAAAAAHYQDEapmEc2byACqAC-EWg0A...PDii4gAA` — base64-ish strings
 *     containing `=`, `+` and `/`. Every id is percent-encoded before it becomes
 *     a path segment, which is the form Graph's own `checklistItems` example
 *     shows in its `@odata.context` (`...AAESAAA%3D`).
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
  /** Extra request headers (e.g. `Prefer: odata.maxpagesize=…`). */
  headers?: Record<string, string>;
}

/** The shape of every Graph collection response. */
export interface GraphList<T> {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
}

/** What the list actions return: one or more pages, plus the cursor to continue. */
export interface PagedResult<T> {
  value: T[];
  /**
   * Present when Graph has more results. Feed it back as the `nextLink` param
   * on the next call — it is a complete URL, not an opaque token.
   */
  nextLink?: string;
  /**
   * Present on a `delta` call when the round has finished. Store it and replay
   * it to collect only what changed since.
   */
  deltaLink?: string;
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

  /**
   * Build an absolute URL. A path already starting with `http` is used as-is —
   * that is how `@odata.nextLink` and `@odata.deltaLink` are replayed.
   */
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
    // 204 carries no body by contract; anything else that fails to parse is
    // treated the same rather than masking a real response as an error.
    if (res.status === 204) return undefined as T;
    return await res.json().catch(() => undefined) as T;
  }

  /**
   * Perform a request whose only meaningful result is "the service accepted
   * it" — every To Do `DELETE`, which answers `204 No Content`.
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
      deltaLink: body?.["@odata.deltaLink"],
      pages: 1,
    };
  }

  /**
   * Walk `@odata.nextLink` up to `maxPages` requests.
   *
   * Bounded on purpose: a task list is unbounded, an action's runtime is not,
   * and a silent infinite walk is the failure mode this replaces. When the cap
   * is hit the surviving `nextLink` is returned so the caller can resume.
   *
   * `deltaLink` is carried through untouched: it only ever appears on the final
   * page of a delta round, which is exactly the page this stops on.
   */
  async collect<T>(
    path: string,
    options: RequestOptions = {},
    maxPages = 10,
  ): Promise<PagedResult<T>> {
    const limit = Math.max(1, Math.floor(maxPages));
    const value: T[] = [];
    let cursor: string | undefined;
    let deltaLink: string | undefined;
    let pages = 0;

    for (;;) {
      // Only the first request carries `query`; a nextLink already embeds it.
      const body = cursor
        ? await this.request<GraphList<T>>(cursor, { headers: options.headers })
        : await this.request<GraphList<T>>(path, options);
      pages++;
      value.push(...(body?.value ?? []));
      deltaLink = body?.["@odata.deltaLink"] ?? deltaLink;
      cursor = body?.["@odata.nextLink"];
      if (!cursor || pages >= limit) break;
    }

    return { value, nextLink: cursor, deltaLink, pages };
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

/** Graph's `itemBody` type. To Do spells the discriminator lowercase. */
export interface ItemBody {
  contentType: "text" | "html";
  content: string;
}

/** Graph's `dateTimeTimeZone` type. `dateTime` has NO trailing `Z` or offset. */
export interface DateTimeTimeZone {
  dateTime: string;
  timeZone?: string;
}

/**
 * Build an `itemBody`, or `undefined` when there is no content to send.
 *
 * The default is `text`, not `html`: To Do renders a task's body as the plain
 * "notes" field, and every v1.0 example response for a `todoTask` comes back as
 * `{"content":"","contentType":"text"}`. (The *update* reference carries a
 * stray "only HTML type is supported" note that the create reference, the
 * examples and the responses all contradict — hence both values are offered and
 * neither is forced.)
 */
export function itemBody(content?: string, contentType?: string): ItemBody | undefined {
  if (content === undefined || content === null) return undefined;
  return {
    contentType: contentType?.toLowerCase() === "html" ? "html" : "text",
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
 * To Do identifiers are opaque, server-issued, base64-ish strings that appear as
 * single path segments and routinely contain `=`, `+` and `/`. Percent-encode
 * once so an id can never break out of its segment.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(id);
}

/** Join a repeated param into the comma-separated form OData expects. */
export function odataList(values?: string[]): string | undefined {
  const joined = (values ?? []).map((v) => (v ?? "").trim()).filter(Boolean).join(",");
  return joined || undefined;
}

/** Drop `undefined` entries so a PATCH only ever touches what the caller set. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/** The subset of `todoTask` this App writes. See `taskFieldParams()`. */
export interface TaskFields {
  title?: string;
  body?: string;
  bodyContentType?: string;
  status?: string;
  importance?: string;
  categories?: string[];
  dueDateTime?: string;
  startDateTime?: string;
  reminderDateTime?: string;
  isReminderOn?: boolean;
  completedDateTime?: string;
  timeZone?: string;
  recurrence?: unknown;
}

/**
 * Turn the flat form input into the nested `todoTask` JSON Graph expects.
 *
 * Shared by Create Task and Update Task so the two cannot drift: the request
 * body is documented identically for `POST .../tasks` and
 * `PATCH .../tasks/{id}`, and the only difference is that PATCH must send
 * *only* what the caller set — hence `compact()` at the end, and hence the
 * per-field `undefined` guards rather than a blanket default.
 */
export function taskPayload(input: TaskFields): Record<string, unknown> {
  const zone = input.timeZone;
  const when = (v?: string) => (v === undefined ? undefined : dateTimeTimeZone(v, zone));
  return compact({
    title: input.title,
    body: itemBody(input.body, input.bodyContentType),
    status: input.status,
    importance: input.importance,
    // An explicit empty list is meaningful on a PATCH ("clear the categories"),
    // so only `undefined` is dropped.
    categories: input.categories,
    dueDateTime: when(input.dueDateTime),
    startDateTime: when(input.startDateTime),
    reminderDateTime: when(input.reminderDateTime),
    isReminderOn: input.isReminderOn,
    completedDateTime: when(input.completedDateTime),
    recurrence: input.recurrence,
  });
}

/** Path prefix for one task list's task collection. */
export function tasksPath(taskList: string): string {
  return `/me/todo/lists/${encodeId(taskList)}/tasks`;
}

/** Path prefix for one task. */
export function taskPath(taskList: string, task: string): string {
  return `${tasksPath(taskList)}/${encodeId(task)}`;
}
