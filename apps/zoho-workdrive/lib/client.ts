import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Zoho WorkDrive API client.
 *
 * Verified 2026-10-06 against
 * `https://www.zoho.com/workdrive/developer/docs/api/v1/` (the 233 pages the vendor's sitemap
 * lists; the overview pages are shells, so every endpoint here was read from its own page).
 *
 *  - Base: `https://www.zohoapis.<tld>/workdrive/api/v1` — host chosen per data centre
 *    (`lib/regions.ts`) and recorded on the Connection by `auth/oauth2.ts#afterConnect`.
 *  - Payloads follow JSON:API: every body is `{ "data": { "type", "attributes" } }` sent as
 *    `application/vnd.api+json`, and every response carries `data` (an object or an array),
 *    optionally `links` / `meta`. The vendor says a request without
 *    `Accept: application/vnd.api+json` may be answered 415.
 *  - Errors: `{ "errors": [ { "id": "F7003", "title": "Invalid OAuth token." } ] }`. The `id`
 *    is the vendor's stable code; the HTTP status is only a hint (a request with NO token is
 *    answered `500 {"errors":[{"id":"F000","title":"INVALID_TICKET"}]}`).
 *  - Pagination: offset (`page[offset]`, `page[limit]`, max 50 for file listings) and cursor
 *    (`page[next]=0` first, then `links.cursor.next`, `links.cursor.has_next`).
 */

export const API_PREFIX = "/workdrive/api/v1";
export const DEFAULT_API_HOST = "www.zohoapis.com";
export const JSONAPI = "application/vnd.api+json";

/** The API host for this connection, as recorded by `afterConnect`. */
export function apiHostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiHost?: string };
  return display.apiHost || DEFAULT_API_HOST;
}

export interface JsonApiError {
  id?: string;
  title?: string;
}

/** Pull the vendor's `errors` array out of a response body, if it has one. */
export function parseErrors(raw: string): JsonApiError[] {
  try {
    const parsed = JSON.parse(raw) as { errors?: JsonApiError[] };
    return Array.isArray(parsed?.errors) ? parsed.errors : [];
  } catch {
    return [];
  }
}

export function formatWorkDriveError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const errors = parseErrors(raw);
  if (errors.length === 0) {
    const trimmed = raw.length > 600 ? `${raw.slice(0, 600)}… (${raw.length} bytes)` : raw;
    return `Zoho WorkDrive ${status} for ${method} ${path}: ${trimmed}`;
  }
  const detail = errors.map((e) => `${e.id ?? "?"}: ${e.title ?? "no title"}`).join("; ");
  return `Zoho WorkDrive ${status} for ${method} ${path}: ${detail}`;
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  query?: Query;
  /** Sent as the JSON body (already wrapped — see {@link jsonApiBody}). */
  body?: unknown;
}

/** Build the JSON:API request envelope `{ data: { type, attributes } }`. */
export function jsonApiBody(type: string, attributes: Record<string, unknown>) {
  return { data: { type, attributes: compact(attributes) } };
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** `{ data, links, meta }` — the JSON:API envelope every response shares. */
export interface JsonApiResponse {
  data?: unknown;
  links?: { cursor?: { has_next?: boolean; next?: string } } & Record<string, unknown>;
  meta?: unknown;
  [key: string]: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime routes every request
 * through the auth `sign` hook, which stamps `Zoho-oauthtoken`.
 */
export class WorkDriveClient {
  readonly host: string;

  constructor(private ctx: HookContext) {
    this.host = apiHostFromConnection(ctx.connection);
  }

  url(path: string, query?: Query): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      qs.set(k, String(v));
    }
    const s = qs.toString();
    return `https://${this.host}${API_PREFIX}${path}${s ? `?${s}` : ""}`;
  }

  async request<T = JsonApiResponse>(
    method: string,
    path: string,
    opts: RequestOptions = {},
  ): Promise<T> {
    const headers: Record<string, string> = { accept: JSONAPI };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = JSONAPI;
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(this.url(path, opts.query), { method, headers, body });
    const text = await res.text();
    if (!res.ok) throw new Error(formatWorkDriveError(res.status, method, path, text));
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Zoho WorkDrive ${res.status} for ${method} ${path}: non-JSON body`);
    }
  }

  get<T = JsonApiResponse>(path: string, query?: Query): Promise<T> {
    return this.request<T>("GET", path, { query });
  }
}

/** Shape a list response: the `data` array plus the cursor state, if the vendor sent one. */
export function listResult(body: JsonApiResponse): {
  items: unknown[];
  hasNext: boolean;
  next: string;
} {
  const data = body.data;
  const cursor = body.links?.cursor;
  return {
    items: Array.isArray(data) ? data : data == null ? [] : [data],
    hasNext: cursor?.has_next === true,
    next: cursor?.next ?? "",
  };
}

/** The `page[...]`/`filter[type]` params common to file listings. */
export function pageQuery(input: {
  limit?: number;
  offset?: number;
  next?: string;
  filterType?: string;
  sort?: string;
}): Query {
  return {
    "page[limit]": input.limit,
    "page[offset]": input.offset,
    "page[next]": input.next,
    "filter[type]": input.filterType,
    sort: input.sort,
  };
}

/** `PATCH /files/{resource_id}` — rename, move, trash, restore, delete and favorite all use it. */
export async function patchFile(
  client: WorkDriveClient,
  resourceId: string,
  attributes: Record<string, unknown>,
): Promise<{ item: unknown }> {
  const body = await client.request("PATCH", `/files/${encodeURIComponent(resourceId)}`, {
    body: jsonApiBody("files", attributes),
  });
  return { item: body.data ?? null };
}
