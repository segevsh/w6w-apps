import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * noCRM.io API client.
 *
 * Every fact in this module comes from noCRM's own API document
 * (<https://www.nocrm.io/api>, fetched and read in full 2026-09-22; a plain
 * Slate-generated page, not a client-rendered one) plus live probes against
 * `<subdomain>.nocrm.io` on the same day.
 *
 * ## Every account has its own host
 *
 * noCRM gives each account its own subdomain — `https://YOUR_SUBDOMAIN.nocrm.io`
 * — and every documented path in the API document is written against that
 * placeholder. A manifest cannot enumerate those, so `w6w.network.allow`
 * declares the wildcard `*.nocrm.io` (`package.json`); the runtime's egress
 * matcher accepts any subdomain of it and still refuses everything else.
 *
 * The subdomain comes from the Connection, not from an Action param: it
 * identifies the account, so it belongs to the Connection. `afterConnect`
 * echoes it onto the connection's redacted `display`, which is where the client
 * reads it from — the same pattern `apps/gorgias` uses for its own per-account
 * host.
 *
 * ## Two credential shapes, one header each
 *
 * Both schemes documented under "Authentication" are plain opaque tokens in a
 * vendor-specific header, and both are injected by the auth `sign` hook, never
 * here:
 *
 *   - `X-API-KEY` — account-level, "grants you admin rights".
 *   - `X-USER-TOKEN` — user-dependent: requests run with that user's own
 *     permissions, and some are refused depending on the user's rights.
 *
 * ## Errors: `{error, message, type}`
 *
 * The document's Errors section states that every failing endpoint answers a
 * JSON object with `error` (the status code), `message` (prose, safe to show,
 * but the document warns it can change) and `type` (the machine-testable
 * code). {@link formatNocrmError} keeps all three.
 *
 * ## Pagination: `X-TOTAL-COUNT` is a header, not a body field
 *
 * The Pagination section: "When requesting a list of resources that will be
 * paginated, a header will be returned, `X-TOTAL-COUNT`, corresponding to the
 * total number of resources before pagination is applied." The list endpoints
 * answer a **bare JSON array**, so there is nowhere in the body for that total
 * to live — {@link NocrmClient.list} reads it off the response and returns the
 * documented `limit`/`offset` pair's companion count alongside the array.
 *
 * Exactly one list endpoint in this app (`GET /v2/leads`) documents `limit` and
 * `offset` of its own; the rest (`steps`, `users`, `teams`, `pipelines`,
 * `categories`, `predefined_tags`, `webhooks`, `clients`) document no query
 * params at all, so this app invents no paging for them.
 */

/** The versioned API, relative to {@link baseUrl}. Every `/v2/...` path in the document. */
export const V2 = "/v2";

/**
 * The Simplified API, relative to {@link baseUrl}. GET-only by design — "This
 * API accepts only GET requests to simplify the use" — and authenticated with
 * `X-API-KEY` only, which the section states is mandatory.
 */
export const SIMPLE = "/simple";

/** The credential-liveness probe (`GET /api/v2/ping`), shared by both auth methods and the `subdomain` health check. */
export const PING_PATH = `${V2}/ping`;

/** Header carrying the account-level API key. */
export const API_KEY_HEADER = "X-API-KEY";

/** Header carrying the user token. */
export const USER_TOKEN_HEADER = "X-USER-TOKEN";

/**
 * Reads the subdomain `afterConnect` recorded on the connection's display data.
 *
 * A function rather than a constant because the Connection is per-account: the
 * same App addresses `acme.nocrm.io` for one connection and `globex.nocrm.io`
 * for another.
 */
export function subdomainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { subdomain?: string };
  if (display.subdomain) return display.subdomain;
  throw new Error(
    "noCRM connection has no subdomain — reconnect the account so it can be recorded.",
  );
}

/** `https://<subdomain>.nocrm.io/api` — the document's own base for every path. */
export function baseUrl(subdomain: string): string {
  return `https://${subdomain}.nocrm.io/api`;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
}

/**
 * The shape {@link NocrmClient.list} returns: the vendor's bare array, plus the
 * documented `X-TOTAL-COUNT` that could not be a body field.
 */
export interface NocrmPage<T = unknown> {
  items: T[];
  totalCount?: number;
}

/** A parsed noCRM error body, per the document's Errors section. */
export interface NocrmErrorBody {
  /** The status code, repeated in the body. */
  error?: number;
  /** Prose. The document says it is nice to display but easy to change. */
  message?: string;
  /** The machine-testable code — `unauthorized_invalid_token`, `missing_parameter`, … */
  type?: string;
}

/** Drop the keys a caller left unset. `false` and `0` survive; `""` does not. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept a tag/name list as either a real array or the comma-separated string a
 * hand-typed field produces. Used for the two documented array bodies
 * (`tags` on lead create/update, `teams` on the user list).
 */
export function stringList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const items = (Array.isArray(value) ? value : String(value).split(","))
    .map((v) => String(v).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Formats a non-2xx response into the error a workflow sees.
 *
 * The document's Errors section is the shape: `{error, message, type}`. `type`
 * is the attribute to test, so it is quoted verbatim; `message` is included
 * because the document says it is the human-facing one.
 *
 * A `429` carries extra prose: noCRM sets `API-RETRY-AFTER` and
 * `API-LIMIT-RESET` on that response and states that requests which are not
 * stopped "might deactivate the API key used or blocked the account".
 */
export function formatNocrmError(
  status: number,
  method: string,
  path: string,
  detail: string,
): string {
  let body: NocrmErrorBody = {};
  try {
    body = JSON.parse(detail) as NocrmErrorBody;
  } catch {
    // Not JSON — fall back to the raw body text.
  }
  const parts = [`noCRM ${status} for ${method} ${path}`];
  if (body.type) parts.push(`[${body.type}]`);
  parts.push(body.message ?? (detail || "(no message)"));
  if (status === 429) {
    parts.push(
      "noCRM rate-limits this API; it sets API-RETRY-AFTER and API-LIMIT-RESET on a 429 and " +
        "states that continuing to send requests may deactivate the API key or block the " +
        "account — back off accordingly",
    );
  }
  return parts.join(": ");
}

/** Reads the vendor's own error code out of a body, without guessing from the status. */
export function parseNocrmError(detail: string): NocrmErrorBody {
  try {
    return JSON.parse(detail) as NocrmErrorBody;
  } catch {
    return {};
  }
}

/** The documented (and live) response body of {@link PING_PATH}. */
export interface PingBody {
  /** `200` on success. */
  status?: number;
  /** `"Your API key is correct."` on success; the vendor's prose on failure. */
  message?: string;
  /** Failure only: the status code, repeated in the body. */
  error?: number;
  /** Failure only: the machine-testable code. */
  type?: string;
}

/**
 * Classify a `GET /api/v2/ping` response **from its body**.
 *
 * The success body — `{"status":200,"message":"Your API key is correct."}` — is
 * a whoami that cannot echo a credential, because it returns none: neither an
 * API key nor a user token ever appears in it, which is what makes it a legal
 * credential probe. It is shared by both auth methods and by the `subdomain`
 * dependency check; only the header differs.
 *
 * Failure is read from the body, never the bare status: the document's Errors
 * section makes `type` "the attribute to test if you want to do a specific
 * process when it happens", and every documented refusal is an `unauthorized_*`
 * type — `unauthorized_missing_token`, `unauthorized_disabled_token`,
 * `unauthorized_invalid_token` — with the `message` field carrying prose the
 * document says is safe to display. Verified live 2026-09-22: an invalid key
 * answers `401 {"error":401,"message":"Unauthorized: invalid api_key",
 * "type":"unauthorized_invalid_token"}`, byte-identical for a made-up
 * subdomain, an existing one, and even an unrouted path (see
 * `health/subdomain.ts` for why that matters).
 */
export function classifyPing(status: number, body: PingBody): { ok: boolean; message?: string } {
  if (typeof body.type === "string" && body.type.startsWith("unauthorized_")) {
    return {
      ok: false,
      message: body.message ?? `noCRM refused the credential (${body.type})`,
    };
  }
  if (body.status === 200) return { ok: true };
  if (status >= 400) {
    return { ok: false, message: body.message ?? `noCRM returned ${status}` };
  }
  return { ok: false, message: "noCRM returned an unrecognised ping response" };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets a credential header — the
 * runtime routes every request through the auth `sign` hook.
 */
export class NocrmClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(subdomainFromConnection(ctx.connection));
  }

  /** A single-resource request. Answers a JSON object (or nothing, on an empty body). */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * A list request. The body is a bare JSON array (see the module doc), and the
   * documented `X-TOTAL-COUNT` — the total before pagination — arrives as a
   * header, so it is returned beside the array rather than lost.
   */
  async list<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<NocrmPage<T>> {
    const res = await this.send(path, options);
    const text = await res.text();
    const items = (text ? JSON.parse(text) : []) as T[];
    const header = res.headers.get("x-total-count");
    const totalCount = header === null || header === "" ? undefined : Number(header);
    return {
      items,
      totalCount: typeof totalCount === "number" && Number.isFinite(totalCount)
        ? totalCount
        : undefined,
    };
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
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
      throw new Error(formatNocrmError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
