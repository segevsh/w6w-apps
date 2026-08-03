/**
 * TickTick **Open API** client — the whole vendor surface this App talks to.
 *
 * Everything here was read off the vendor's own documentation source on
 * 2026-08-03. That source is worth naming precisely, because the human-facing
 * URL is a docsify shell that renders nothing to a fetcher:
 *
 *   - `https://developer.ticktick.com/docs#/openapi` — what a human sees.
 *   - `https://developer.ticktick.com/docs/openapi.md` — the actual markdown
 *     the shell loads (67,340 bytes on 2026-08-03), and the only machine-
 *     readable form of the spec TickTick publishes. `GET /docs` itself answers
 *     **404** with the developer-portal SPA's HTML.
 *
 * There is no OpenAPI/Swagger document, no `.well-known` discovery, and no
 * versioning header — `/open/v1` in the path is the whole version contract.
 *
 * Five things this file exists to absorb:
 *
 *  1. **The date format is not ISO-8601 as JavaScript emits it.** TickTick
 *     documents `"yyyy-MM-dd'T'HH:mm:ssZ"` where `Z` is a *numeric* offset with
 *     no colon — `2019-11-13T03:00:00+0000`. `Date#toISOString()` and every
 *     `datetime` form control produce `…T03:00:00.000Z` or `…+00:00`, neither of
 *     which matches. `ticktickDate()` normalises to the documented form.
 *
 *  2. **Bare arrays, not envelopes.** `GET /project` returns a JSON array at the
 *     top level; so do `POST /task/filter` and `POST /task/completed`. There is
 *     no `{ data: … }` wrapper, no cursor, no `total` — and consequently **no
 *     pagination anywhere in this API**. See the README.
 *
 *  3. **"OK / No Content" successes.** Complete Task, Delete Task and Delete
 *     Project are documented as `200 OK` with schema *No Content*. Calling
 *     `res.json()` on an empty body throws, so those route through `status()`.
 *
 *  4. **`POST` is the update verb.** There is no `PUT` and no `PATCH` in this
 *     API: Update Task is `POST /task/{taskId}`, Update Project is
 *     `POST /project/{projectId}`. That is TickTick's spelling, not a mistake
 *     here. (The doc even leaves an `<a name="updateusingput">` anchor above
 *     Update Task, a fossil of an earlier `PUT` shape.)
 *
 *  5. **The error body is an OAuth-style envelope, not a REST one.** A rejected
 *     call answers
 *     `{"error":"invalid_token","error_description":"…","errors":[{"message":"…"}]}`
 *     — confirmed on the wire against `api.ticktick.com` on 2026-08-03.
 *     `describeFailure()` reads it so an operator sees the vendor's own words.
 *
 * Note there is no `Authorization` header anywhere in this file: the runtime
 * routes every request through the Auth `sign` hook, which is the only code
 * handed the credential.
 */
import type { HookContext } from "@w6w/types";

/** The only base URL TickTick documents. `/open/v1` is the entire version contract. */
export const API_URL = "https://api.ticktick.com/open/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Query parameters. `undefined` / `null` / `""` entries are dropped. */
  query?: Record<string, QueryValue>;
  /** JSON value → JSON-encoded body. `undefined` → no body at all. */
  body?: unknown;
}

/** TickTick's error envelope. Same shape for `401`, `403` and `4xx` generally. */
interface TickTickError {
  error?: string;
  error_description?: string;
  errors?: Array<{ message?: string }>;
}

/** Thin wrapper over `ctx.fetch`. */
export class TickTickClient {
  constructor(private ctx: HookContext) {}

  private url(path: string, query?: Record<string, QueryValue>): URL {
    const url = new URL(`${API_URL}${path}`);
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
    const headers: Record<string, string> = { accept: "application/json" };
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
    return await res.json().catch(() => undefined) as T;
  }

  /**
   * Perform a request whose only meaningful result is "TickTick accepted it".
   *
   * Complete Task, Delete Task and Delete Project are all documented as `200 OK`
   * with schema *No Content*, and an empty body is not valid JSON.
   */
  async status(path: string, options: RequestOptions = {}): Promise<{ status: number }> {
    const res = await this.fire(path, options);
    return { status: res.status };
  }

  /**
   * Perform a request documented as returning a bare JSON array, and guarantee
   * an array back.
   *
   * A `200` carrying something that is not an array is a contract break, not
   * data — the actions would rather surface `[]` than hand a workflow a value
   * of the wrong shape.
   */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<T[]> {
    const body = await this.request<unknown>(path, options);
    return Array.isArray(body) ? body as T[] : [];
  }
}

/** Surface TickTick's own `error` / `error_description` when it sends one. */
async function describeFailure(res: Response, method: string, url: URL): Promise<string> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as TickTickError;
      const parts = [
        parsed.error,
        parsed.error_description ?? parsed.errors?.[0]?.message,
      ].filter(Boolean);
      detail = parts.join(": ") || text;
    } catch {
      detail = text;
    }
  } catch { /* body already consumed or unreadable */ }
  // `url.pathname` only — never `url.href`. Nothing here interpolates a
  // credential, and the path is the part an operator needs.
  return `TickTick ${res.status} ${res.statusText} for ${method} ${url.pathname}: ${detail}`.trim();
}

// ------------------------------------------------------------------- dates --

/**
 * Normalise a timestamp to TickTick's documented `"yyyy-MM-dd'T'HH:mm:ssZ"`.
 *
 * `Z` in that pattern is Java's *numeric* offset — `+0000`, `-0800` — not the
 * literal letter and not `+00:00`. Three real inputs and what happens to each:
 *
 *   | Input                        | Output                     |
 *   | ---------------------------- | -------------------------- |
 *   | `2026-08-10T17:00:00Z`       | `2026-08-10T17:00:00+0000` |
 *   | `2026-08-10T17:00:00+02:00`  | `2026-08-10T17:00:00+0200` |
 *   | `2026-08-10T17:00:00`        | `2026-08-10T17:00:00+0000` |
 *
 * Fractional seconds are **stripped**. The documented pattern has none, and
 * every request example for Create/Update Task omits them; the two newer filter
 * endpoints happen to show `.000+0000` in *their* examples, but a parser that
 * accepts millis necessarily accepts their absence, so emitting the documented
 * form everywhere is the one choice that is safe against both.
 *
 * A value this cannot recognise is passed through untouched rather than
 * mangled — better a vendor `400` naming the field than a silently wrong date.
 */
export function ticktickDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const m = trimmed.match(
    /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?)(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/i,
  );
  if (!m) return trimmed;

  let [, stamp, offset] = m;
  stamp = stamp.replace(" ", "T");
  // A `datetime-local` control omits seconds entirely; the pattern wants them.
  if (stamp.length === 16) stamp += ":00";

  if (!offset || offset.toUpperCase() === "Z") return `${stamp}+0000`;
  return `${stamp}${offset.replace(":", "")}`;
}

/** `ticktickDate` for an optional field: `undefined` stays `undefined`. */
export function optionalDate(value?: string): string | undefined {
  return value === undefined || value === null ? undefined : ticktickDate(value);
}

// ------------------------------------------------------------------ shapes --

/** Drop `undefined` entries so an update only ever carries what the caller set. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * TickTick ids are 24-character hex ObjectIds (`6226ff9877acee87727f6bca`), so
 * they are URL-safe by construction — but they arrive from workflow expressions,
 * which are not. Percent-encode once so an id can never break out of its path
 * segment.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(id);
}

/** The subset of `Task` this App writes. Shared by Create Task and Update Task. */
export interface TaskFields {
  title?: string;
  content?: string;
  desc?: string;
  isAllDay?: boolean;
  startDate?: string;
  dueDate?: string;
  timeZone?: string;
  reminders?: string[];
  tags?: string[];
  repeatFlag?: string;
  priority?: number;
  sortOrder?: number;
  items?: unknown;
}

/**
 * Turn the flat form input into the `Task` JSON TickTick expects.
 *
 * The request-body tables for `POST /task` and `POST /task/{taskId}` are
 * field-for-field identical apart from the two ids, so one builder serves both
 * and the pair cannot drift. `compact()` at the end means an update carries only
 * what was set.
 *
 * `items` (subtasks) is passed through verbatim: it is an array of
 * `ChecklistItem` objects with seven members each, and there is no per-subtask
 * endpoint to fall back on, so half-modelling it in form controls would be worse
 * than handing it over honestly as JSON.
 */
export function taskPayload(input: TaskFields): Record<string, unknown> {
  return compact({
    title: input.title,
    content: input.content,
    desc: input.desc,
    isAllDay: input.isAllDay,
    startDate: optionalDate(input.startDate),
    dueDate: optionalDate(input.dueDate),
    timeZone: input.timeZone,
    reminders: input.reminders,
    tags: input.tags,
    repeatFlag: input.repeatFlag,
    priority: input.priority,
    sortOrder: input.sortOrder,
    items: input.items,
  });
}

/** The subset of `OpenHabit` this App writes. Shared by Create Habit and Update Habit. */
export interface HabitFields {
  name?: string;
  iconRes?: string;
  color?: string;
  sortOrder?: number;
  status?: number;
  encouragement?: string;
  type?: string;
  goal?: number;
  step?: number;
  unit?: string;
  repeatRule?: string;
  reminders?: string[];
  recordEnable?: boolean;
  sectionId?: string;
  targetDays?: number;
  targetStartDate?: number;
  completedCycles?: number;
  exDates?: string[];
  style?: number;
}

/**
 * Turn the flat form input into the `OpenHabit` JSON TickTick expects.
 *
 * Enumerated explicitly rather than spread from the input, so an unrelated key
 * on the action input can never become a body field. The request-body tables for
 * `POST /habit` and `POST /habit/{habitId}` are identical apart from `name`
 * being required on the first, so one builder serves both.
 *
 * Read-only members of `OpenHabit` — `id`, `totalCheckIns`, `createdTime`,
 * `modifiedTime`, `archivedTime`, `etag` — appear in the definition table but
 * not in either request table, and are deliberately absent here.
 */
export function habitPayload(input: HabitFields): Record<string, unknown> {
  return compact({
    name: input.name,
    iconRes: input.iconRes,
    color: input.color,
    sortOrder: input.sortOrder,
    status: input.status,
    encouragement: input.encouragement,
    type: input.type,
    goal: input.goal,
    step: input.step,
    unit: input.unit,
    repeatRule: input.repeatRule,
    reminders: input.reminders,
    recordEnable: input.recordEnable,
    sectionId: input.sectionId,
    targetDays: input.targetDays,
    targetStartDate: input.targetStartDate,
    completedCycles: input.completedCycles,
    exDates: input.exDates,
    style: input.style,
  });
}

/** Path prefix for one project. */
export function projectPath(project: string): string {
  return `/project/${encodeId(project)}`;
}

/** Path for one task addressed through its project (get, complete, delete). */
export function projectTaskPath(project: string, task: string): string {
  return `${projectPath(project)}/task/${encodeId(task)}`;
}
