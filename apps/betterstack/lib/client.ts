import type { HookContext } from "@w6w/types";

/**
 * Thin client for the Better Stack **Uptime API** (`uptime.betterstack.com`).
 *
 * Verified on 2026-10-06 against Better Stack's own API reference
 * (`betterstack.com/docs/uptime/api/*`, each page's `.md` variant) and live
 * probes. Three things here are not what the reference's examples suggest:
 *
 *  1. **The host.** The reference examples all say `incidents.betterstack.com`
 *     (the product's old name) and so do the `pagination.next` URLs in every
 *     list response. `uptime.betterstack.com` answers the same routes with the
 *     same bodies (measured: identical 401 body on `/api/v2/monitors`,
 *     `/api/v3/incidents` and the rest), so this app uses the one host and
 *     never follows a `pagination.next` URL: it reads the `page` number out of
 *     it instead (`pageInfo`). Egress stays at a single declared hostname.
 *  2. **Two API versions on one host.** Incidents and escalation policies are
 *     `/api/v3`; everything else here is `/api/v2`.
 *  3. **JSON:API envelopes.** Every resource is `{id, type, attributes,
 *     relationships}`. {@link flatten} lifts the attributes up so a workflow
 *     reads `monitor.status`, not `monitor.attributes.status`.
 */
export const API_BASE = "https://uptime.betterstack.com";
export const V2 = "/api/v2";
export const V3 = "/api/v3";

export class BetterStackError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly vendorMessage: string | undefined,
  ) {
    super(message);
    this.name = "BetterStackError";
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Trim and URL-encode a path segment; an empty id would silently hit the list route. */
export function encodeId(id: unknown): string {
  const s = String(id ?? "").trim();
  if (!s) throw new Error("A required ID was empty");
  return encodeURIComponent(s);
}

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/**
 * Better Stack's error body is `{"errors": "<message>"}` — a string — and an
 * unknown route answers `{"errors": "Endpoint GET /… does not exist.",
 * "see_docs": …}`. Validation failures are not documented; an object or array
 * under `errors` is rendered rather than assumed away.
 */
export function errorMessage(body: unknown): string | undefined {
  const errors = (body as { errors?: unknown } | null)?.errors;
  if (typeof errors === "string") return errors;
  if (errors && typeof errors === "object") return JSON.stringify(errors);
  return undefined;
}

/**
 * Drop `undefined`/`null`/empty-string inputs so an unset form field is never
 * sent as an explicit null (which on a PATCH would *clear* the setting).
 */
export function pick(input: Record<string, unknown>, keys: readonly string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = input[k];
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** A `json` param may arrive as already-parsed data or as the raw text the user typed. */
export function parseJsonField(name: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

export interface RequestOptions {
  query?: Query;
  body?: Record<string, unknown>;
}

/** One request; returns the parsed JSON body (`{}` for an empty body, e.g. a 204). */
export async function call(
  ctx: HookContext,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  opts: RequestOptions = {},
): Promise<unknown> {
  const headers: Record<string, string> = { accept: "application/json" };
  const init: RequestInit = { method, headers };
  if (opts.body && Object.keys(opts.body).length > 0) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  const res = await ctx.fetch(buildUrl(path, opts.query), init);
  const text = await res.text();
  let json: unknown = {};
  if (text.trim()) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { errors: text.slice(0, 200) };
    }
  }
  if (!res.ok) {
    const vendor = errorMessage(json);
    throw new BetterStackError(
      `Better Stack ${method} ${path} failed (${res.status})${vendor ? `: ${vendor}` : ""}`,
      res.status,
      vendor,
    );
  }
  return json;
}

// --- JSON:API ---------------------------------------------------------------

export interface JsonApiResource {
  id?: string | number;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: unknown } | undefined>;
}

export type Scrub = (attributes: Record<string, unknown>) => Record<string, unknown>;

/** `{id, type, attributes, relationships}` -> `{...attributes, id, type, relationships}`. */
export function flatten(
  resource: JsonApiResource | null | undefined,
  scrub?: Scrub,
): Record<string, unknown> {
  if (!resource || typeof resource !== "object") return {};
  const attrs = scrub
    ? scrub({ ...(resource.attributes ?? {}) })
    : { ...(resource.attributes ?? {}) };
  const out: Record<string, unknown> = { ...attrs, id: resource.id, type: resource.type };
  if (resource.relationships) {
    const rels: Record<string, unknown> = {};
    for (const [name, rel] of Object.entries(resource.relationships)) {
      rels[name] = rel?.data ?? null;
    }
    out.relationships = rels;
  }
  return out;
}

export interface PageInfo {
  /** A further page exists. */
  hasMore: boolean;
  /** The `page` number to ask for next, or null on the last page. */
  nextPage: number | null;
}

/**
 * Read `pagination.next` for its `page` number only. The URL's host is
 * `incidents.betterstack.com`, which this app neither declares nor calls.
 */
export function pageInfo(pagination: unknown): PageInfo {
  const next = (pagination as { next?: unknown } | null)?.next;
  if (typeof next !== "string" || !next) return { hasMore: false, nextPage: null };
  try {
    const page = Number(new URL(next).searchParams.get("page"));
    return Number.isFinite(page) && page > 0
      ? { hasMore: true, nextPage: page }
      : { hasMore: true, nextPage: null };
  } catch {
    return { hasMore: true, nextPage: null };
  }
}

interface ListBody {
  data?: JsonApiResource[];
  included?: JsonApiResource[];
  pagination?: unknown;
}

/** A paginated JSON:API list -> `{items, count, hasMore, nextPage}`. */
export async function listResources(
  ctx: HookContext,
  path: string,
  query: Query,
  scrub?: Scrub,
): Promise<Record<string, unknown>> {
  const body = await call(ctx, "GET", path, { query }) as ListBody;
  const items = (body.data ?? []).map((r) => flatten(r, scrub));
  const out: Record<string, unknown> = { items, count: items.length, ...pageInfo(body.pagination) };
  if (body.included?.length) out.included = body.included.map((r) => flatten(r));
  return out;
}

/** A single JSON:API resource (`{data: {…}}`) -> the flattened resource. */
export async function oneResource(
  ctx: HookContext,
  method: "GET" | "POST" | "PATCH",
  path: string,
  opts: RequestOptions = {},
  scrub?: Scrub,
): Promise<Record<string, unknown>> {
  const body = await call(ctx, method, path, opts) as { data?: JsonApiResource };
  return flatten(body.data, scrub);
}

/** `DELETE` -> `{deleted: true, id}`; the vendor answers 204 with no body. */
export async function removeResource(
  ctx: HookContext,
  path: string,
  id: string,
): Promise<{ deleted: true; id: string }> {
  await call(ctx, "DELETE", path);
  return { deleted: true, id };
}

// --- scrubbing --------------------------------------------------------------

const SENSITIVE_HEADER = /authorization|cookie|token|secret|password|api[-_]?key|x-auth/i;
export const REDACTED = "[redacted]";

/** `user:pass@host` / `http://user:pass@host` -> userinfo replaced, host kept. */
export function redactUserinfo(value: string): string {
  return value.replace(
    /^([a-z][a-z0-9+.-]*:\/\/)?[^/@\s]+@/i,
    (_m, scheme) => `${scheme ?? ""}***@`,
  );
}

/**
 * A monitor read returns three things that can hold a secret the user typed
 * into the form: `proxy_host` ("can include authentication credentials (e.g.
 * `user:pass@proxy.example.com`)" — the reference's own words),
 * `environment_variables` (the reference's own example is
 * `{"PASSWORD": "passw0rd"}`), and `request_headers` (an `Authorization`
 * header the check sends to the monitored site). Values are redacted; keys and
 * header names stay, so a workflow can still see *what* is configured.
 */
export const scrubMonitor: Scrub = (a) => {
  delete a.auth_password;
  if (typeof a.proxy_host === "string") a.proxy_host = redactUserinfo(a.proxy_host);
  if (a.environment_variables && typeof a.environment_variables === "object") {
    a.environment_variables = Object.fromEntries(
      Object.keys(a.environment_variables).map((k) => [k, REDACTED]),
    );
  }
  if (Array.isArray(a.request_headers)) {
    a.request_headers = a.request_headers.map((h: Record<string, unknown>) =>
      typeof h?.name === "string" && SENSITIVE_HEADER.test(h.name) ? { ...h, value: REDACTED } : h
    );
  }
  return a;
};

/**
 * An escalation policy read carries `incident_token`, an opaque token the
 * reference's example shows and does not explain. Nothing in a workflow needs
 * it, and a token of unstated power is not returned by default, so it is dropped.
 */
export const scrubPolicy: Scrub = (a) => {
  delete a.incident_token;
  return a;
};
