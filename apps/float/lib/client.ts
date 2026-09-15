import type { HookContext } from "@w6w/types";

/**
 * Float API v3 REST client.
 *
 * Everything in this module was verified on 2026-09-15 against Float's own
 * OpenAPI 2.0 (Swagger) document, served in fragments from
 * `developer.float.com/swagger-api-v3.yaml` plus its `paths/*.yaml` includes
 * (`info.version` `3.0.0`), and against live probes of `api.float.com` and
 * `status.float.com`. Nothing here came from a third-party integration
 * directory.
 *
 * ## One host, one prefix, no envelope
 *
 * The spec declares `host: api.float.com`, `basePath: /v3`, and every
 * response is a bare JSON object or array — unlike Apify or many other
 * vendors, there is no `{"data": …}` wrapper to unwrap. List endpoints answer
 * a bare array with pagination reported entirely in response headers
 * (`X-Pagination-Total-Count`, `-Page-Count`, `-Current-Page`, `-Per-Page`),
 * never in the body.
 *
 * ## Two findings that shaped this module
 *
 * 1. **A missing `Authorization` header never reaches Float's own API at
 *    all.** Live probes on 2026-09-15 show an edge/WAF layer in front of Kong
 *    that answers a request with NO `Authorization` header with a bare
 *    `403 Forbidden` — `text/html`, no JSON, no Float-specific information —
 *    regardless of `User-Agent`. The instant an `Authorization: Bearer …`
 *    header is present, even holding a nonsense token, the request reaches
 *    Float's own gateway and gets Float's real JSON error shape:
 *    `{"name":"Unauthorized","message":"Your request was made with invalid
 *    credentials.","code":0,"status":401}`, plus real `ratelimit-*` headers.
 *    A `res.json()` on every 401/403 alike throws on the first case, so
 *    {@link parseFloatError} checks `content-type` before parsing.
 * 2. **Two create endpoints break the object-in/object-out pattern.**
 *    `POST /v3/logged-time` answers `200` (not `201`) with an ARRAY of
 *    entries, and its own id (`logged_time_id`) is a string, not the integer
 *    every other Float id is. `POST /v3/status` and `PATCH /v3/status/{id}`
 *    answer `{"status": [...]}` — because creating a status that overlaps an
 *    existing one for that person silently deletes the old one and returns
 *    both in the same array. See `actions/logged-time-create.ts` and
 *    `actions/status-create.ts`.
 *
 * ## Errors
 *
 * A real Float error is `{"name", "message", "code", "status"}` — see
 * {@link formatFloatError}. `422` (validation) bodies follow the same shape.
 *
 * ## Rate limits
 *
 * Primary data endpoints: 200 requests/minute (GET) / 100 requests/minute
 * (POST/PATCH/DELETE) per company, with an undocumented-in-headers burst
 * ceiling of 10/s (GET) / 4/s (non-GET). Reports endpoints: 30/minute (GET).
 * A signed response carries BOTH `ratelimit-limit`/`ratelimit-remaining`/
 * `ratelimit-reset` (IETF draft form) and `x-ratelimit-limit-minute`/
 * `x-ratelimit-remaining-minute` (Float's own legacy names) for the SAME
 * per-minute meter — measured identical on the wire on 2026-09-15. Neither
 * header set describes the stricter burst ceiling; that one is silent until
 * you get a `429`. See `health/quota.ts`.
 *
 * ## Identify yourself
 *
 * Float's authentication docs ask every integration to send a `User-Agent`
 * identifying the app plus a contact email ("Glenn's People Import
 * Integration (glenn@example.com)"). This is NOT enforced by the edge (a
 * request without one still reaches the API once `Authorization` is present,
 * measured 2026-09-15), but it is the vendor's own explicit, printed request,
 * and it costs nothing to honour — so this client sends one unconditionally.
 * It is not a credential, so it belongs here rather than in `sign`.
 */

/** The one and only API origin. The spec declares no other server. */
export const API_BASE = "https://api.float.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/v3";

/**
 * Sent on every request per Float's own "Identify Yourself" guidance
 * (`overview_authentication.html`). Not a credential — safe to hardcode.
 */
export const USER_AGENT = "w6w Float app (integrations@w6w.io)";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** The four `X-Pagination-*` response headers every list endpoint carries. */
export interface FloatPagination {
  totalCount?: number;
  pageCount?: number;
  currentPage?: number;
  perPage?: number;
}

export interface FloatListPage<T> {
  items: T[];
  pagination: FloatPagination;
}

interface FloatErrorBody {
  name?: string;
  message?: string;
  code?: number;
  status?: number;
}

/**
 * Drop keys the caller left unset. `false` and `0` survive: e.g. `active=0`
 * and `hours=0` are both meaningful, and silently dropping them would make
 * them impossible to express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Render a `1`/`0` integer-boolean field the way Float's schema documents it. */
export function intBool(v: boolean | undefined): number | undefined {
  return v === undefined ? undefined : v ? 1 : 0;
}

/** Normalise a comma-separated-or-array param into a comma-joined string. */
export function toCsv(v: string[] | string | number[] | undefined | null): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = Array.isArray(v) ? v : String(v).split(",");
  const trimmed = items.map((s) => String(s).trim()).filter(Boolean);
  return trimmed.length ? trimmed.join(",") : undefined;
}

/** Accept a `json`-typed param as either a parsed value or the string a user typed. */
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
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Float's error response into one actionable line.
 *
 * Handles the two shapes documented in this module's header comment: a real
 * Float error (`{"name","message","code","status"}`, JSON) and the edge/WAF
 * refusal that precedes it (`text/html`, `403 Forbidden`, no JSON at all —
 * this is what a request reaching Float with NO `Authorization` header gets,
 * regardless of the credential's validity).
 */
export function formatFloatError(
  status: number,
  method: string,
  path: string,
  contentType: string,
  raw: string,
): string {
  const isJson = contentType.toLowerCase().includes("json");
  if (!isJson) {
    if (status === 403 && !raw.includes("Float")) {
      return `Float ${status} for ${method} ${path}: request was refused before reaching Float's ` +
        "API (no JSON body) — this is what happens when no Authorization header is present at " +
        "all, not necessarily a bad credential. Reconnect this connection.";
    }
    return `Float ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  let parsed: FloatErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as FloatErrorBody;
  } catch { /* fall through to the raw body */ }

  if (!parsed?.message && !parsed?.name) {
    return `Float ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const parts = [
    `Float ${status} ${parsed.name ?? "error"} for ${method} ${path}`,
    parsed.message,
    status === 429
      ? "Float rate-limits per company (200/min GET, 100/min non-GET, with a stricter per-second " +
        "burst ceiling); retry with backoff"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

function readPagination(headers: Headers): FloatPagination {
  const num = (name: string): number | undefined => {
    const v = headers.get(name);
    if (v === null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    totalCount: num("x-pagination-total-count"),
    pageCount: num("x-pagination-page-count"),
    currentPage: num("x-pagination-current-page"),
    perPage: num("x-pagination-per-page"),
  };
}

export class FloatClient {
  constructor(private ctx: HookContext) {}

  /** `GET` a list endpoint — a bare JSON array plus `X-Pagination-*` headers. */
  async list<T = unknown>(
    path: string,
    query: Record<string, QueryValue> = {},
  ): Promise<FloatListPage<T>> {
    const res = await this.send(path, { method: "GET", query });
    if (res.status === 204) return { items: [], pagination: readPagination(res.headers) };
    const text = await res.text();
    const items = text ? (JSON.parse(text) as T[]) : [];
    return { items, pagination: readPagination(res.headers) };
  }

  /** Parse a JSON body without any list/pagination handling. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** `DELETE` — Float answers every delete with `204 No Content`. */
  async remove(path: string): Promise<void> {
    await this.send(path, { method: "DELETE" });
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      "user-agent": USER_AGENT,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatFloatError(res.status, init.method ?? "GET", url.pathname, contentType, detail),
      );
    }
    return res;
  }
}
