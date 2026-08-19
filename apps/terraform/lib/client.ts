import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * The HCP Terraform / Terraform Enterprise API — verified live against
 * `app.terraform.io` on 2026-08-18 (`tfp-api-version: 2.6`,
 * `tfp-appname: HCP Terraform`).
 *
 * ## It is JSON:API, and nothing else in this pack is
 *
 * Every request and every response is `application/vnd.api+json`. That is not
 * a content-type detail, it is the whole shape:
 *
 * - The payload is **always** wrapped: `{"data": {"type": …, "id": …,
 *   "attributes": {…}, "relationships": {…}}}`. A list is `data` as an array.
 * - The fields a workflow wants are one level down in `attributes`, and their
 *   names are **kebab-case** — `auto-apply`, `terraform-version`,
 *   `execution-mode`, `resource-changes`. Not snake_case, not camelCase. A
 *   PATCH sending `auto_apply` is accepted and ignored.
 * - Links between objects live in `relationships` as `{type, id}` pointers.
 *   The object itself is somewhere else — see `include` below.
 * - The server ignores an attribute it does not recognise rather than
 *   rejecting it, so a typo in a PATCH is a silent no-op that returns 200.
 *
 * This app unwraps all of that: actions take and return flat objects, and the
 * envelope is built here.
 *
 * ## `include` sideloads — the related object is NOT nested
 *
 * `?include=workspace` does not put the workspace inside the run. It appends a
 * top-level `included` array, and the run keeps a pointer. Reading
 * `run.workspace.name` gets `undefined` from a response that does contain the
 * name. `resolve()` below joins them back.
 *
 * ## The rate limit is per second, and that changes what it means
 *
 * Measured on every response:
 *
 *     x-ratelimit-limit: 30
 *     x-ratelimit-remaining: 29
 *     x-ratelimit-reset: 1.0
 *
 * Thirty requests **per second**, resetting in one. `reset` is a fractional
 * number of seconds, not a Unix timestamp — parsing it as one gives a date in
 * January 1970. And "29 remaining" is not headroom: the window refills a
 * second later, so a point sample says nothing about capacity. It is a
 * burst limit, and the way to stay under it is to not fan out, not to check.
 *
 * ## The host is not always HashiCorp's
 *
 * Terraform Enterprise is the same API, self-hosted, at whatever address the
 * organisation put it. `https://app.terraform.io` is the default and the
 * managed service; a connection may point anywhere.
 */

/** The managed service. Terraform Enterprise is the same API, elsewhere. */
export const DEFAULT_HOST = "https://app.terraform.io";

/** JSON:API's media type. Sending `application/json` is refused on writes. */
export const MEDIA_TYPE = "application/vnd.api+json";

/** Public (redacted-safe) connection metadata. */
export interface TerraformConnectionDisplay {
  /** The instance origin — HCP Terraform, or a Terraform Enterprise host. */
  host?: string;
  /** `HCP Terraform` or `Terraform Enterprise`, from `tfp-appname`. */
  appName?: string;
  /** The API version this instance reported at connect time. */
  apiVersion?: string;
  /** The account the token belongs to. */
  username?: string;
  /** The default organisation, when the connection recorded one. */
  organization?: string;
}

/**
 * Normalise a user-typed host into an origin.
 *
 * Terraform Enterprise is reached at a bare hostname more often than a URL,
 * and the API is always on https.
 */
export function normalizeHost(raw: unknown): string {
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_HOST;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`the Terraform host is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`the Terraform host has no hostname: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** The instance origin for this connection, defaulting to the managed service. */
export function hostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as TerraformConnectionDisplay;
  return normalizeHost(display.host);
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** A JSON:API document, sent verbatim. Use `document()` to build one. */
  body?: unknown;
  /** Override the origin — the status check reads a different host entirely. */
  host?: string;
}

/** A JSON:API resource object. */
export interface Resource {
  type?: string;
  id?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { type?: string; id?: string } | Array<unknown> }>;
  links?: Record<string, unknown>;
}

/** A JSON:API document. */
export interface Document<T = Resource | Resource[]> {
  data?: T;
  included?: Resource[];
  meta?: Record<string, unknown>;
  links?: Record<string, unknown>;
  errors?: Array<{ status?: string; title?: string; detail?: string }>;
}

/** What the rate-limit headers said. Note the units — see the header. */
export interface RateLimit {
  limit?: number;
  remaining?: number;
  /** **Seconds** until the window refills, fractional. Not a timestamp. */
  resetsIn?: number;
}

export interface Result<T> {
  document: Document<T>;
  rateLimit: RateLimit;
  /** `tfp-appname` — `HCP Terraform` or `Terraform Enterprise`. */
  appName?: string;
  /** `tfp-api-version` — the instance's API version. */
  apiVersion?: string;
  status: number;
}

/** Drop keys the caller left unset, so a default is not overwritten with nothing. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** `compact`, but an object with nothing left in it is left out entirely. */
export function emptyToUndefined(
  obj: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const compacted = compact(obj);
  return Object.keys(compacted).length ? compacted : undefined;
}

/** Split a comma-separated form field into a list, or leave it unset. */
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

/** Coerce a params bag into query values, dropping what was left unset. */
export function query(input: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "boolean" || typeof v === "number" ? v : String(v);
  }
  return out;
}

/**
 * Build the JSON:API envelope a write needs.
 *
 * Every POST and PATCH is `{"data": {"type": …, "attributes": …}}`, and the
 * `type` is required and checked — a workspace PATCH sent with type `"run"` is
 * a 422, not a rename.
 */
export function document(
  type: string,
  attributes: Record<string, unknown>,
  relationships?: Record<string, unknown>,
): Document<Resource> {
  return {
    data: {
      type,
      ...(Object.keys(attributes).length ? { attributes } : {}),
      ...(relationships && Object.keys(relationships).length ? { relationships } : {}),
    } as Resource,
  };
}

/** A `relationships` entry pointing at one resource. */
export function relation(type: string, id: string): { data: { type: string; id: string } } {
  return { data: { type, id } };
}

/**
 * Flatten a JSON:API resource into `{id, ...attributes}`.
 *
 * The attribute names stay as the API spells them — kebab-case — because
 * renaming them here would mean a workflow's field reference stopped matching
 * the vendor's own documentation.
 */
export function flatten(resource: Resource | undefined): Record<string, unknown> | undefined {
  if (!resource) return undefined;
  return { id: resource.id, type: resource.type, ...(resource.attributes ?? {}) };
}

/** Flatten a list. */
export function flattenAll(resources: Resource[] | undefined): Array<Record<string, unknown>> {
  return (resources ?? []).map((entry) => flatten(entry)!).filter(Boolean);
}

/**
 * Join a sideloaded `included` array back onto the record that points at it.
 *
 * `?include=workspace` returns the workspace as a sibling of the run, not
 * inside it. Anything reading `run.workspace.name` gets `undefined` from a
 * response that does contain the name — this is the fix.
 */
export function resolve(
  resource: Resource | undefined,
  name: string,
  included: Resource[] | undefined,
): Record<string, unknown> | undefined {
  const pointer = resource?.relationships?.[name]?.data;
  if (!pointer || Array.isArray(pointer)) return undefined;
  const match = (included ?? []).find((entry) =>
    entry.type === pointer.type && entry.id === pointer.id
  );
  return flatten(match);
}

/** The id a relationship points at, without needing the object. */
export function relatedId(resource: Resource | undefined, name: string): string | undefined {
  const pointer = resource?.relationships?.[name]?.data;
  if (!pointer || Array.isArray(pointer)) return undefined;
  return pointer.id;
}

/**
 * Read the rate-limit headers.
 *
 * `x-ratelimit-reset` is **seconds**, fractional — `1.0`, not an epoch. The
 * usual `new Date(reset * 1000)` gives 1 January 1970.
 */
export function parseRateLimit(headers: Headers): RateLimit {
  const num = (name: string) => {
    const raw = headers.get(name);
    if (raw === null) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };
  return {
    limit: num("x-ratelimit-limit"),
    remaining: num("x-ratelimit-remaining"),
    resetsIn: num("x-ratelimit-reset"),
  };
}

/**
 * Pagination lives in `meta.pagination`, in kebab-case like everything else:
 * `current-page`, `next-page`, `total-pages`, `total-count`. `next-page` is
 * `null` on the last page.
 */
export interface Pagination {
  page?: number;
  nextPage?: number;
  totalPages?: number;
  totalCount?: number;
}

export function pagination(meta: Record<string, unknown> | undefined): Pagination {
  const raw = (meta?.pagination ?? {}) as Record<string, unknown>;
  const num = (key: string) => {
    // `next-page` is explicitly `null` on the last page, and `Number(null)` is
    // 0 — a page number that exists, so a paging loop would ask for page 0.
    if (raw[key] === null || raw[key] === undefined) return undefined;
    const value = Number(raw[key]);
    return Number.isFinite(value) ? value : undefined;
  };
  return {
    page: num("current-page"),
    nextPage: num("next-page"),
    totalPages: num("total-pages"),
    totalCount: num("total-count"),
  };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the token — the runtime routes
 * every request through the auth `sign` hook.
 */
export class TerraformClient {
  readonly host: string;

  constructor(private ctx: HookContext, host?: string) {
    this.host = host ?? hostFromConnection(ctx.connection);
  }

  async request<T = Resource>(path: string, options: RequestOptions = {}): Promise<Document<T>> {
    return (await this.full<T>(path, options)).document;
  }

  /** The same, keeping the headers the instance reports about itself. */
  async full<T = Resource>(path: string, options: RequestOptions = {}): Promise<Result<T>> {
    const url = new URL(`${options.host ?? this.host}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: MEDIA_TYPE };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      // `application/json` is refused on a write. This is the one that works.
      headers["content-type"] = MEDIA_TYPE;
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    const rateLimit = parseRateLimit(res.headers);
    const appName = res.headers.get("tfp-appname") ?? undefined;
    const apiVersion = res.headers.get("tfp-api-version") ?? undefined;

    if (!res.ok) {
      throw new Error(
        `Terraform ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }

    if (res.status === 204 || !text) {
      return { document: {} as Document<T>, rateLimit, appName, apiVersion, status: res.status };
    }
    try {
      return {
        document: JSON.parse(text) as Document<T>,
        rateLimit,
        appName,
        apiVersion,
        status: res.status,
      };
    } catch {
      throw new Error(`Terraform did not return JSON:API: ${text.slice(0, 160)}`);
    }
  }
}

/**
 * Turn a Terraform error into something actionable.
 *
 * Errors are a JSON:API array — `{"errors":[{"status":"401",
 * "title":"unauthorized"}]}` — and the useful half is often only in `detail`,
 * which is frequently absent. A bare `"unauthorized"` is what a missing token,
 * a revoked token, an organisation token used for something only a user token
 * may do, and a workspace outside the token's team all look like.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as Document;
    const errors = body?.errors ?? [];
    if (errors.length) {
      detail = errors.map((e) => [e.title, e.detail].filter(Boolean).join(": ")).join("; ");
    }
  } catch { /* not JSON */ }

  if (status === 401) {
    return `${detail} — the token was not accepted. HCP Terraform answers a bare "unauthorized" ` +
      "for a missing token, a revoked one, and one belonging to a different instance alike";
  }
  if (status === 403) {
    return `${detail} — the token authenticated and is not permitted here. TOKEN TYPE is the ` +
      "usual cause: an organization token cannot create runs or read state, and a team token " +
      "only reaches the workspaces that team was granted";
  }
  if (status === 404) {
    return `${detail} — Terraform answers 404 rather than 403 for a resource the token cannot ` +
      "see, so this may mean it does not exist OR that this token has no access to it";
  }
  if (status === 409) {
    return `${detail} — the resource is in a state that forbids this. A locked workspace, or a ` +
      "run that has already been applied, discarded or cancelled";
  }
  if (status === 422) {
    return `${detail} — the document was rejected. JSON:API requires the right \`type\`, and ` +
      "attribute names are KEBAB-case (`auto-apply`, not `auto_apply`); an unrecognised " +
      "attribute is ignored silently rather than reported";
  }
  if (status === 429) {
    return `${detail} — over the burst limit of 30 requests per second. It refills in about a ` +
      "second, so this is a fan-out problem rather than a quota problem";
  }
  return detail || `${status}`;
}
