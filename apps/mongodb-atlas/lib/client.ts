import type { HookContext } from "@w6w/types";

/**
 * The MongoDB Atlas Administration API — verified against MongoDB's own
 * OpenAPI document (`github.com/mongodb/openapi`, `openapi/v2.json`, 335
 * paths, fetched 2026-08-19) and probed live against `cloud.mongodb.com` the
 * same day.
 *
 * ## This is the control plane, not the database
 *
 * Nothing here reads or writes a document. This API creates clusters, manages
 * who may connect and from where, and reports what the deployment is doing.
 * Querying the data means a MongoDB driver speaking the wire protocol to
 * `mongodb+srv://…`, which is a different protocol on a different port and
 * not something an HTTP app can do.
 *
 * That distinction matters for what this app is *for*: provisioning, access
 * management, and operational visibility — the things a workflow can usefully
 * automate around a database it does not itself query.
 *
 * ## Versioning is a date in the Accept header, per endpoint
 *
 *     Accept: application/vnd.atlas.2025-03-12+json
 *
 * Not a URL segment and not a custom header. The date selects the resource
 * version in effect then, and **each endpoint has its own set of versions** —
 * measured across the spec: 319 operations at `2023-01-01`, 78 at
 * `2025-03-12`, and `flexClusters` exists only from `2024-11-13`.
 *
 * The consequence is the trap: pinning an **old** date is what breaks. An
 * endpoint introduced after the pinned date does not exist at that version,
 * and the error is not "your version is too old". So this app sends a recent
 * date by default, and each action may raise it where the spec requires a
 * newer one — never lower it.
 *
 * Omitting the header entirely is worse: the API falls back to the oldest
 * version, and a response shape silently rolls back several years.
 *
 * ## Digest is offered and is unusable here
 *
 * An unauthenticated call answers:
 *
 *     www-authenticate: Digest realm="MMS Public API", nonce="…", qop="auth"
 *
 * That is the legacy API-key scheme, and HTTP Digest needs a challenge
 * round-trip — request, 401 with a nonce, re-request with a hash of it. A
 * `sign` hook sees one request and no challenge, so it cannot participate.
 * Service-account OAuth is the supported alternative and the one this app
 * uses; see `auth/service-account.ts`.
 *
 * ## Projects are called `groups` in every path
 *
 * The interface says "project" everywhere. The API says `groups`, because that
 * is what they were called in MongoDB Cloud Manager before Atlas existed. The
 * id is a 24-character hex ObjectId and appears in the console URL. Both names
 * mean the same thing, and searching the docs for "project" finds prose while
 * the paths say `groups`.
 */

/** The Atlas control plane. There is one, and it is not regional. */
export const API_HOST = "https://cloud.mongodb.com";

/** Where a service account's client credentials are exchanged for a token. */
export const OAUTH_TOKEN_URL = `${API_HOST}/api/oauth/token`;

/**
 * The default resource version. Recent on purpose — an old date is what makes
 * a newer endpoint 404, and there is no error that says so.
 */
export const DEFAULT_VERSION = "2025-03-12";

/** The Accept (and Content-Type) value for a given resource version. */
export function mediaType(version: string = DEFAULT_VERSION): string {
  return `application/vnd.atlas.${version}+json`;
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /**
   * Raise the resource version for an endpoint that needs a newer one. Never
   * lower it — an older date drops back to an older response shape.
   */
  version?: string;
}

/** Atlas paginates everything the same way. */
export interface Paginated<T> {
  results?: T[];
  totalCount?: number;
  links?: Array<{ rel?: string; href?: string }>;
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
 * A project id is a 24-character hex ObjectId.
 *
 * Checked here because the API's answer to a malformed one is the same 401 it
 * gives for everything else — the id is validated after authorisation, so a
 * typo reads as a credential problem.
 */
export function projectId(value: unknown, field = "projectId"): string {
  const id = String(value ?? "").trim();
  if (!id) throw new Error(`\`${field}\` is required`);
  if (!/^[0-9a-f]{24}$/i.test(id)) {
    throw new Error(
      `\`${field}\` must be a 24-character hex project id — got "${id}". Atlas calls projects ` +
        "`groups` in its paths, and the id is the one in the console URL, not the project's name",
    );
  }
  return id;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the token — the runtime routes
 * every request through the auth `sign` hook.
 */
export class AtlasClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_HOST}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const accept = mediaType(options.version);
    const headers: Record<string, string> = { accept };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      // The versioned type is required on writes too, not just on reads.
      headers["content-type"] = accept;
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Atlas ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text, options.version)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Atlas did not return JSON: ${text.slice(0, 160)}`);
    }
  }

  /** A paginated read, unwrapped to the results and the total. */
  async list<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ results: T[]; totalCount?: number }> {
    const body = await this.request<Paginated<T>>(path, options);
    return {
      results: Array.isArray(body?.results) ? body.results : [],
      totalCount: typeof body?.totalCount === "number" ? body.totalCount : undefined,
    };
  }
}

/**
 * Turn an Atlas error into something actionable.
 *
 * Errors are `{"error": 401, "reason": "Unauthorized", "detail": "…",
 * "errorCode": "UNEXPECTED_ERROR"}` — and `errorCode` is the useful field
 * while `detail` is often generic. Measured live: an unauthenticated call and
 * a call with a bad bearer token both give 401, but the first carries that
 * JSON body and the second has **no body at all**.
 */
export function describeError(status: number, text: string, version?: string): string {
  let detail = text.slice(0, 300);
  let errorCode = "";
  try {
    const body = JSON.parse(text) as { detail?: string; reason?: string; errorCode?: string };
    errorCode = String(body?.errorCode ?? "");
    detail = body?.detail || body?.reason || detail;
  } catch { /* a bearer 401 has no body at all */ }

  if (status === 401) {
    return `${detail || "unauthorized"}${errorCode ? ` [${errorCode}]` : ""} — the token was not ` +
      "accepted. A service-account token lasts an hour, so this is usually an expired one; note " +
      "Atlas answers 401 for a malformed project id too, because ids are validated after " +
      "authorisation";
  }
  if (status === 403) {
    return `${detail}${errorCode ? ` [${errorCode}]` : ""} — authenticated and not permitted. ` +
      "Atlas roles are per PROJECT as well as per organisation, so a service account with " +
      "organisation access still needs a role on the project it is reaching into";
  }
  if (status === 404) {
    return `${detail}${errorCode ? ` [${errorCode}]` : ""} — not found. If the resource plainly ` +
      `exists, check the API version: this call asked for ${version ?? DEFAULT_VERSION}, and an ` +
      "endpoint introduced after that date does not exist at that version — the error says " +
      "nothing about versions";
  }
  if (status === 409) {
    return `${detail}${errorCode ? ` [${errorCode}]` : ""} — the deployment is busy. Atlas ` +
      "refuses a change while a cluster is still applying the previous one, and cluster changes " +
      "take minutes";
  }
  return `${detail}${errorCode ? ` [${errorCode}]` : ""}` || `${status}`;
}
