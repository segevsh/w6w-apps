import type { HookContext } from "@w6w/types";

/**
 * Productive.io REST client.
 *
 * Verified 2026-10-06 against the vendor's own OpenAPI 3.1 document
 * (`developer.productive.io/reference/download_spec`, `api-master.yaml`, 404 paths) and its
 * guides, plus unauthenticated live probes of `api.productive.io`.
 *
 * ## One host, JSON:API
 *
 * Every path hangs off `https://api.productive.io/api/v2`. Bodies and answers are JSON:API
 * (`application/vnd.api+json`). `Content-Type` is mandatory and is checked BEFORE
 * authentication: a POST with `application/json` answers `415 unsupported_content_type` even
 * with no token at all (measured), so every request here sends the JSON:API type.
 *
 * ## Where the credentials go
 *
 * Nowhere in this file. `X-Auth-Token` and `X-Organization-Id` are both stamped by the Auth
 * `sign` hook; an action only ever builds a path, a query and a body.
 *
 * ## Ids live in `attributes`, not `relationships`
 *
 * The vendor's request schemas declare `project_id`, `task_list_id`, `assignee_id`, ... as
 * ATTRIBUTES, and its own Docs guide posts `"project_id": 12345` inside `attributes`. So
 * {@link jsonApiBody} sends `{ data: { type, attributes } }` and nothing else. Responses still
 * carry the usual `relationships`, which {@link flattenResource} folds in as `{ id, type }`.
 *
 * ## Flattening
 *
 * A workflow step wants `task.title`, not `task.attributes.title`, so a resource is returned as
 * its attributes plus `id`, `type` and (when the answer carried identifiers) `relationships`.
 * Pass `include` to side-load related resources; they come back flattened under `included`.
 *
 * ## Errors
 *
 * Failures are `{"errors":[{status, code, title, detail, source?}]}` where `status` is a
 * STRING (`"401"`), not a number (measured). A missing and a wrong token answer the same
 * `401 invalid_auth_token`; the vendor `code` and `title` are what classify, not the status.
 */

export const API_BASE = "https://api.productive.io/api/v2";
export const CONTENT_TYPE = "application/vnd.api+json";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Headers every request carries. The credential is not here: only `sign` adds it. */
export function baseHeaders(): Record<string, string> {
  return { accept: CONTENT_TYPE, "content-type": CONTENT_TYPE };
}

/** Escape a path segment so an id can never change which resource a path names. */
export function encodeId(id: string | number): string {
  const s = String(id).trim();
  if (!s) throw new Error("Productive: an id is required");
  return encodeURIComponent(s);
}

/** Drop undefined / null / empty-string entries (`false` and `0` are kept). */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export function queryString(query: Record<string, QueryValue> = {}): string {
  const sp = new URLSearchParams();
  // Only undefined / null are dropped: an empty `page[after]` is meaningful (see `listQuery`).
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** A JSON object given as an object or a JSON string. */
export function toObject(v: unknown, name: string): Record<string, unknown> | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  let parsed = v;
  if (typeof v === "string") {
    try {
      parsed = JSON.parse(v);
    } catch {
      throw new Error(`Productive: ${name} is not valid JSON`);
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Productive: ${name} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/** Wrap attributes as the JSON:API request document the vendor documents. */
export function jsonApiBody(type: string, attributes: Record<string, unknown>) {
  return { data: { type, attributes: compact(attributes) } };
}

/** Throw when an update names nothing to change (the vendor would answer with a no-op). */
export function requireAny(attributes: Record<string, unknown>, what: string): void {
  if (Object.keys(compact(attributes)).length === 0) {
    throw new Error(`Productive: ${what} needs at least one field to change`);
  }
}

// --- list queries -------------------------------------------------------------------------

export interface ListInput {
  /** Extra filters as a JSON object: `{"project_id": 24}`, `{"name": {"contains": "x"}}`. */
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  /** Use cursor pagination from the first page (an empty `page[after]`). */
  cursorPaging?: boolean;
  /** A `nextCursor` returned by a previous call. Implies cursor pagination. */
  cursor?: string;
}

/**
 * Serialise a filter object the way the vendor documents it: `filter[k]=v`,
 * `filter[k][op]=v`, a list as `filter[k]=1,2,3`, and nested objects (including the
 * `$op` / numbered-operand logical groups) as further bracketed keys.
 */
export function serializeFilter(
  filter: Record<string, unknown>,
  prefix = "filter",
  out: Record<string, QueryValue> = {},
): Record<string, QueryValue> {
  for (const [k, v] of Object.entries(filter)) {
    if (v === undefined || v === null || v === "") continue;
    const key = `${prefix}[${k}]`;
    if (Array.isArray(v)) out[key] = v.join(",");
    else if (typeof v === "object") serializeFilter(v as Record<string, unknown>, key, out);
    else out[key] = v as QueryValue;
  }
  return out;
}

/** Build the whole query of a list call: filters, sort, include and pagination. */
export function listQuery(
  input: ListInput,
  typedFilters: Record<string, unknown> = {},
  extra: Record<string, QueryValue> = {},
): Record<string, QueryValue> {
  const filter = { ...(toObject(input.filter, "filter") ?? {}), ...compact(typedFilters) };
  const query: Record<string, QueryValue> = { ...serializeFilter(filter), ...extra };
  if (input.sort) query.sort = input.sort;
  if (input.include) query.include = input.include;
  if (input.pageSize !== undefined && input.pageSize !== null) {
    query["page[size]"] = input.pageSize;
  }
  if (input.cursor || input.cursorPaging) {
    // An empty `page[after]` is how the vendor asks for the first cursor page.
    query["page[after]"] = input.cursor ?? "";
  } else if (input.pageNumber !== undefined && input.pageNumber !== null) {
    query["page[number]"] = input.pageNumber;
  }
  return query;
}

// --- resources ----------------------------------------------------------------------------

interface ResourceIdentifier {
  id?: string;
  type?: string;
}

interface JsonApiResource {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: ResourceIdentifier | ResourceIdentifier[] | null }>;
}

/** `{ id, type, ...attributes, relationships? }`, relationships kept only when they carry ids. */
export function flattenResource(r: JsonApiResource): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(r.attributes ?? {}), id: r.id, type: r.type };
  const rels: Record<string, unknown> = {};
  for (const [name, rel] of Object.entries(r.relationships ?? {})) {
    if (rel && "data" in rel && rel.data !== undefined) rels[name] = rel.data;
  }
  if (Object.keys(rels).length > 0) out.relationships = rels;
  return out;
}

/** The vendor's error list as one readable string. */
export function errorText(body: unknown): string | undefined {
  const errors = (body as { errors?: unknown })?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return undefined;
  const parts = errors.map((e) => {
    const err = (e ?? {}) as Record<string, unknown>;
    const pointer = (err.source as { pointer?: unknown } | undefined)?.pointer;
    const head = [err.title, err.detail].filter((x) => typeof x === "string" && x).join(": ");
    return pointer ? `${head} (${pointer})` : head;
  }).filter(Boolean);
  return parts.length ? parts.join("; ") : undefined;
}

/** The first vendor error `code`, e.g. `invalid_auth_token`. */
export function errorCode(body: unknown): string | undefined {
  const errors = (body as { errors?: unknown })?.errors;
  if (!Array.isArray(errors)) return undefined;
  const code = (errors[0] as { code?: unknown } | undefined)?.code;
  return typeof code === "string" ? code : undefined;
}

/** True for the documented error envelope: an `errors` array of objects with a title or code. */
export function isErrorEnvelope(body: unknown): boolean {
  const errors = (body as { errors?: unknown })?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return false;
  const first = errors[0] as Record<string, unknown> | null;
  return !!first && typeof first === "object" &&
    (typeof first.title === "string" || typeof first.code === "string");
}

function cursorOf(next: unknown): string | null {
  if (typeof next !== "string" || !next) return null;
  try {
    return new URL(next).searchParams.get("page[after]");
  } catch {
    return null;
  }
}

export class ProductiveClient {
  constructor(private ctx: HookContext) {}

  /** One resource, flattened (with `included` when side-loaded); `{ ok, id }` for a 204. */
  async one(path: string, opts: RequestOptions = {}): Promise<Record<string, unknown>> {
    const body = await this.send(path, opts) as Record<string, unknown> | null;
    if (body === null || body === undefined) return { ok: true };
    const data = body.data as JsonApiResource | undefined;
    if (!data || Array.isArray(data)) {
      throw new Error(`Productive: expected a single resource from ${path}`);
    }
    const out = flattenResource(data);
    if (Array.isArray(body.included)) {
      out.included = (body.included as JsonApiResource[]).map(flattenResource);
    }
    return out;
  }

  /** A collection, flattened, with the vendor's page metadata. */
  async many(path: string, opts: RequestOptions = {}): Promise<Record<string, unknown>> {
    const body = await this.send(path, opts) as Record<string, unknown> | null;
    const data = body?.data;
    if (!Array.isArray(data)) {
      throw new Error(`Productive: expected a JSON:API collection from ${path}`);
    }
    const meta = (body?.meta ?? {}) as Record<string, unknown>;
    const links = (body?.links ?? {}) as Record<string, unknown>;
    const out: Record<string, unknown> = {
      items: (data as JsonApiResource[]).map(flattenResource),
      count: data.length,
      totalCount: meta.total_count ?? null,
      totalPages: meta.total_pages ?? null,
      currentPage: meta.current_page ?? null,
      pageSize: meta.page_size ?? null,
      hasMore: typeof links.next === "string" && links.next.length > 0,
      nextCursor: cursorOf(links.next),
    };
    if (Array.isArray(body?.included)) {
      out.included = (body!.included as JsonApiResource[]).map(flattenResource);
    }
    return out;
  }

  /** DELETE (or a body-less PATCH): the vendor answers 204, reported as `{ ok: true, id }`. */
  async remove(path: string, id: string | number): Promise<Record<string, unknown>> {
    await this.send(path, { method: "DELETE" });
    return { ok: true, id: String(id) };
  }

  private async send(path: string, opts: RequestOptions): Promise<unknown> {
    const res = await this.ctx.fetch(`${API_BASE}${path}${queryString(opts.query)}`, {
      method: opts.method ?? "GET",
      headers: baseHeaders(),
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        if (res.ok) throw new Error(`Productive ${res.status}: response was not JSON`);
      }
    }
    if (!res.ok) {
      const msg = errorText(parsed) ?? (text ? text.slice(0, 300) : res.statusText);
      const reset = res.status === 429 ? res.headers.get("x-ratelimit-reset") : null;
      const retry = reset ? ` (window resets in ${reset}s)` : "";
      throw new Error(`Productive ${res.status}${msg ? `: ${msg}` : ""}${retry}`);
    }
    return parsed;
  }
}

/** A copy of `obj` without the named keys (used to keep stored secrets out of an answer). */
export function omitKeys(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out = { ...obj };
  for (const k of keys) delete out[k];
  return out;
}
