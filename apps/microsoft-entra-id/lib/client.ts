/**
 * Microsoft Graph client — the whole vendor surface this App talks to.
 *
 * Everything here was checked against the Microsoft Graph **v1.0** reference
 * (https://learn.microsoft.com/en-us/graph/api/overview?view=graph-rest-1.0). The old
 * Azure AD Graph (`graph.windows.net`) is retired and is not used.
 *
 * Four directory-specific things this file exists to absorb:
 *
 *  1. **The OData envelope.** Collections come back as `{ "value": [...] }` and the continuation
 *     cursor is `@odata.nextLink` — an *absolute URL* that already carries every query parameter of
 *     the original request. Replay it verbatim; `$skip` is **not supported** on directory
 *     collections (users, groups, applications, servicePrincipals, deleted items).
 *
 *  2. **Advanced queries.** Directory objects are served from an index that supports `$search`,
 *     `$orderby` on some properties, `ne`/`not`/`endsWith` filters and `$count` only when the
 *     request carries `ConsistencyLevel: eventual` and, except for `$search`, `$count=true`.
 *     https://learn.microsoft.com/en-us/graph/aad-advanced-queries — `listQuery()` sets both
 *     together (harmlessly sending `$count` with `$search` too) and re-sends the header when a
 *     `nextLink` is replayed.
 *
 *  3. **Reference vs. object.** `DELETE /groups/{id}/members/{id}` WITHOUT the trailing `/$ref`
 *     deletes the member *object* from the directory if the caller may. Every membership removal
 *     in this App goes through `/$ref`, built by `refPath()`.
 *
 *  4. **Ids are GUIDs, but a user can be addressed by UPN too.** A UPN starting with `$` breaks the
 *     `/users/{upn}` form (OData reads it as a system option); the documented workaround is
 *     `/users('$x@y.com')`, which `userPath()` uses.
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
  /** Extra request headers (e.g. `ConsistencyLevel: eventual`). */
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
  /** `@odata.count` of the first page — present only when `$count=true` was requested. */
  count?: number;
  /** Present when Graph has more results; a complete URL, feed it back as `nextLink`. */
  nextLink?: string;
  /** How many HTTP requests were actually made. */
  pages: number;
}

/** Graph's error envelope: `{ "error": { "code": "...", "message": "..." } }`. */
interface GraphError {
  error?: { code?: string; message?: string };
}

/** The header that switches a directory query onto the advanced (indexed) path. */
export const ADVANCED_HEADERS: Record<string, string> = { ConsistencyLevel: "eventual" };

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * There is no `Authorization` header anywhere in this file: the runtime routes every request
 * through the Auth `sign` hook, which is the only code handed the credential.
 */
export class GraphClient {
  constructor(private ctx: HookContext) {}

  /** Build an absolute URL. A path already starting with `http` is used as-is (a `nextLink`). */
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

  /** Perform a request and decode the JSON body (`undefined` for a 202/204 or empty body). */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.fire(path, options);
    if (res.status === 202 || res.status === 204) return undefined as T;
    return await res.json().catch(() => undefined) as T;
  }

  /** Fetch exactly one page of a collection. */
  async page<T>(path: string, options: RequestOptions = {}): Promise<PagedResult<T>> {
    const body = await this.request<GraphList<T>>(path, options);
    return {
      value: body?.value ?? [],
      count: body?.["@odata.count"],
      nextLink: body?.["@odata.nextLink"],
      pages: 1,
    };
  }

  /**
   * Walk `@odata.nextLink` up to `maxPages` requests. Bounded on purpose: a directory can hold
   * hundreds of thousands of objects and an action's runtime is not unbounded. When the cap is
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
    let count: number | undefined;
    let pages = 0;

    for (;;) {
      // Only the first request carries `query`; a nextLink already embeds it.
      const body = cursor
        ? await this.request<GraphList<T>>(cursor, { headers: options.headers })
        : await this.request<GraphList<T>>(path, options);
      pages++;
      if (pages === 1) count = body?.["@odata.count"];
      value.push(...(body?.value ?? []));
      cursor = body?.["@odata.nextLink"];
      if (!cursor || pages >= limit) break;
    }

    return { value, count, nextLink: cursor, pages };
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

// ------------------------------------------------------------------ lists --

/** The OData controls every directory collection shares. Mirrors `pagingParams()`. */
export interface ListInput {
  top?: number;
  filter?: string;
  search?: string;
  orderby?: string;
  select?: string[];
  advancedQuery?: boolean;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * Wrap a `$search` expression in the double quotes Graph requires
 * (`$search="displayName:Browser"`). An expression the caller already quoted is left alone.
 */
export function quoteSearch(expr: string): string {
  const s = expr.trim();
  return s.startsWith('"') ? s : `"${s}"`;
}

/** True when a replayed `nextLink` came from an advanced query and so needs the header again. */
export function needsConsistency(nextLink: string): boolean {
  return /[?&](\$|%24)(search|count)=/i.test(nextLink);
}

/** Translate the shared list controls into a query string + headers. */
export function listQuery(input: ListInput): {
  query: Record<string, QueryValue>;
  headers: Record<string, string>;
} {
  const search = input.search?.trim() ? quoteSearch(input.search) : undefined;
  // `$search` is only served by the advanced path, so it switches that path on by itself.
  const advanced = Boolean(input.advancedQuery || search);
  return {
    query: {
      $top: input.top,
      $filter: input.filter?.trim(),
      $search: search,
      $orderby: input.orderby?.trim(),
      $select: odataList(input.select),
      $count: advanced ? true : undefined,
    },
    headers: advanced ? { ...ADVANCED_HEADERS } : {},
  };
}

/**
 * Run a directory list: one page by default, every page up to `maxPages` when `all` is set, or the
 * continuation of an earlier run when `nextLink` is given (the link already carries its query).
 */
export function runList<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  input: ListInput,
): Promise<PagedResult<T>> {
  const client = new GraphClient(ctx);
  const replay = input.nextLink?.trim();
  const { query, headers } = listQuery(input);
  const options: RequestOptions = replay
    ? { headers: needsConsistency(replay) || input.advancedQuery ? { ...ADVANCED_HEADERS } : {} }
    : { query, headers };
  const target = replay || path;
  return input.all
    ? client.collect<T>(target, options, input.maxPages ?? 10)
    : client.page<T>(target, options);
}

// ---------------------------------------------------------------- helpers --

/**
 * Percent-encode one path segment. `@` is kept literal: it is what every Graph example uses for a
 * UPN (`/users/AdeleV@contoso.com`), and `#` (B2B guests) is encoded as `%23` as the docs require.
 */
export function seg(value: string): string {
  return encodeURIComponent((value ?? "").trim()).replaceAll("%40", "@");
}

/** `/users/{id | userPrincipalName}`, using the `('…')` form for a UPN that starts with `$`. */
export function userPath(idOrUpn: string): string {
  const v = (idOrUpn ?? "").trim();
  return v.startsWith("$") ? `/users('${v.replaceAll("'", "''")}')` : `/users/${seg(v)}`;
}

/** `/groups/{id}/{members|owners}/{memberId}/$ref` — the reference-only delete form. */
export function refPath(groupId: string, relation: "members" | "owners", objectId: string): string {
  return `/groups/${seg(groupId)}/${relation}/${seg(objectId)}/$ref`;
}

/** The `@odata.id` Graph wants when adding a member or owner by reference. */
export function directoryObjectRef(id: string): { "@odata.id": string } {
  return { "@odata.id": `${API_URL}/directoryObjects/${seg(id)}` };
}

/**
 * Prefix a *local* validation failure so it is legible as ours rather than as Graph's.
 */
export function entraError(message: string): string {
  return `Microsoft Entra ID: ${message}`;
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
    if (v !== undefined && v !== "") out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Accept the `json` param either as an object or as a JSON string (a form field arrives as text),
 * and refuse anything that is not a plain object.
 */
export function jsonObject(value: unknown, label: string): Record<string, unknown> {
  if (value === undefined || value === null || value === "") return {};
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(entraError(`${label} is not valid JSON.`));
    }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(entraError(`${label} must be a JSON object.`));
  }
  return parsed as Record<string, unknown>;
}
