import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Relevance AI REST client.
 *
 * Everything in this module was verified on 2026-09-22 against the vendor's own
 * live, unauthenticated OpenAPI document —
 * `GET https://api-f1db6c.stack.tryrelevance.com/latest/openapi_schema.json`,
 * 11,792,917 bytes, `openapi: 3.0.0`, `info.title: "Relevance AI Endpoints"`,
 * 527 paths — plus live HTTP probes against the same host. Nothing came from a
 * third-party integration directory. `relevanceai.com/docs/api-reference/*` is
 * deliberately unused: those rendered pages are Mintlify's unfilled template
 * (Lorem ipsum, a sample `api.mintlify.com` host).
 *
 * ## No fixed host — the account's region is part of the URL
 *
 * The OpenAPI document declares exactly one server, `{"url": "/latest"}`, with
 * no `host` at all, and the vendor's own core-concepts page says every request
 * goes to `https://api-<region_id>.stack.tryrelevance.com/latest/…` where
 * `<region_id>` is read off the user's own API Keys page. Three region ids are
 * named as canonical in the vendor's enterprise docs (AU `f1db6c`, EU `d7b62b`,
 * US `bcbe5a`) but the schema's own `region` enum on
 * `TriggerAgentInput.agent_override.origin.region` lists **ten** — so the region
 * id is a Connection field, the same way Zendesk's `subdomain` is, and the
 * manifest allowlists the wildcard `*.stack.tryrelevance.com` rather than a
 * hostname this app could not enumerate.
 *
 * ## Auth — one opaque key in one header, with no prefix
 *
 * The schema's security scheme is explicit:
 *
 *     "AuthorizationHeader": {
 *       "type": "apiKey", "in": "header", "name": "Authorization",
 *       "description": "Authorization credentials. Header authorization should
 *        be in the form of: project:api_key"
 *     }
 *
 * The key the user copies out of the Relevance AI UI already has that
 * `project_id:secret` shape baked in as one opaque string, so it is sent
 * verbatim: no `Bearer`, no splitting, no wrapping.
 *
 * ## Errors — a JSON body with a `message` and an `error_type`
 *
 * Failures are `{"message", "error_type", "error_audience"}` with a 4xx status,
 * and the status is *not* the classifier: a missing header answers **401**
 * `authorization_header_missing`, while a syntactically plausible but wrong key
 * answers **400** `unset_error_type`. `test` in `auth/api-token.ts` reads the
 * body for exactly that reason, and {@link formatRelevanceError} keeps both the
 * type and the vendor's sentence instead of flattening them into "HTTP 400".
 *
 * ## Unauthenticated shape probes still identify a live route
 *
 * Every path this app builds was probed on 2026-09-22 with no credential. A
 * real route answers the vendor's JSON error envelope (401
 * `authorization_header_missing`, or a resource-level error such as
 * `agent_not_found`), while a path that does not exist answers Express's HTML
 * `Cannot POST /latest/studios/list`. That distinction is what makes the
 * unauthenticated probe evidence rather than a guess.
 */

/**
 * The host tail every region host shares. The manifest allowlists this as the
 * wildcard `*.stack.tryrelevance.com`; the region id is prepended at call time
 * from the Connection.
 */
export const API_HOST_SUFFIX = "stack.tryrelevance.com";

/** The OpenAPI document's single server is `/latest`, so every path carries it. */
export const API_VERSION = "latest";

/**
 * A region id as the Connection collects it.
 *
 * Deliberately permissive — the ten ids in the vendor's own enum are six hex
 * characters, but nothing promises the eleventh will be, and rejecting a valid
 * region id is worse than accepting a typo the probe will catch immediately.
 * Mirrors Zendesk's `subdomain` field rather than tightening it.
 */
export const REGION_ID_PATTERN = "^[a-zA-Z0-9-]+$";

export type QueryValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | Record<string, unknown>
  | unknown[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: Record<string, unknown>;
}

/** The vendor's error envelope, observed live on 400s, 401s, 403s, 404s and 422s. */
export interface RelevanceErrorBody {
  message?: string;
  error_type?: string;
  error_audience?: string;
}

/** `GetAuthHeaderInfoOutput` — the whoami. No secret or key field exists in it. */
export interface AuthInfo {
  user_id?: string;
  key_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  role?: string;
  permissions?: Record<string, unknown>;
}

/**
 * The region id lives on the Connection, not on an Action param.
 *
 * `auth/api-token.ts`'s `afterConnect` records it on the connection's redacted
 * `display`, which is exactly what Zendesk does with its subdomain: the region
 * identifies the ACCOUNT, so re-entering it per action would invite a workflow
 * to point at a different region than the key belongs to.
 */
export function regionIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { regionId?: string };
  if (display.regionId) return display.regionId;
  throw new Error(
    "Relevance AI connection has no region id — reconnect the account so it can be recorded.",
  );
}

/** `https://api-<region_id>.stack.tryrelevance.com/latest` — the whole base. */
export function baseUrl(regionId: string): string {
  return `https://api-${regionId}.${API_HOST_SUFFIX}/${API_VERSION}`;
}

/**
 * Drop keys the caller left unset, from the TOP LEVEL of a request body.
 *
 * Only the top level: a tool's own `params` object is a payload the tool
 * defines, and a `""` or `null` inside it may be exactly what the tool asked
 * for, so nested values are never rewritten.
 */
export function compact(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Path-escape a caller-supplied id.
 *
 * Every id in this API is constrained to `^[a-zd._-]+$` (the schema's own
 * pattern, max 240 chars) for `agent_id`, `studio_id` and `job_id` alike, so
 * escaping changes nothing for a valid id while neutralising a `/` or `?`
 * somebody pastes in from a URL.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * A `json` param arrives in whichever shape it was entered, so both are handled
 * here rather than at each call site. An empty value means "not supplied".
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Is this body a successful whoami?
 *
 * The success test is **presence of `user_id` and `key_id`**, not the status
 * code: `GetAuthHeaderInfoOutput` always carries both on a success, and every
 * observed failure carries an `error_type`/`message` instead — including the
 * wrong-key case, which arrives as HTTP **400**.
 */
export function isAuthInfo(body: unknown): body is AuthInfo {
  if (!body || typeof body !== "object") return false;
  const b = body as AuthInfo;
  return typeof b.user_id === "string" && typeof b.key_id === "string";
}

/**
 * Turn a failed response into an actionable sentence.
 *
 * `error_type` is a stable machine code and is kept verbatim, because the fix
 * differs per code — `authorization_header_missing` means the credential never
 * reached the request (reconnect), while `unset_error_type` with
 * "not found in Postgres" means the key itself is wrong.
 */
export function formatRelevanceError(
  status: number,
  method: string,
  path: string,
  detail: string,
): string {
  let body: RelevanceErrorBody | null = null;
  try {
    body = JSON.parse(detail) as RelevanceErrorBody;
  } catch {
    body = null;
  }

  const parts = [`Relevance AI ${status} for ${method} ${path}`];
  if (body?.error_type) parts.push(body.error_type);
  if (body?.message) parts.push(body.message);
  else if (!body && detail) parts.push(truncate(detail, 300));
  if (body?.error_type === "authorization_header_missing") {
    parts.push("the credential did not reach the request — reconnect this connection");
  }
  return parts.join(": ");
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the Authorization header: the
 * runtime routes every request through the auth `sign` hook, so the credential
 * stays out of this file and out of every Action.
 */
export class RelevanceAiClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(regionIdFromConnection(ctx.connection));
  }

  /** Parse the JSON body. A 200 with an empty body (both cancels) yields `undefined`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Relevance AI returned a non-JSON body for ${options.method ?? "GET"} ${path}: ${
          truncate(text, 200)
        }`,
      );
    }
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // `filters`/`sort` arrive as a parsed array/object (from `asOptionalJson`)
      // when the caller already passed a structured value rather than typing a
      // JSON string — the vendor's own list endpoints take those as a JSON
      // string in the query, so re-encode here rather than at every call site.
      url.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(compact(options.body));
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatRelevanceError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
