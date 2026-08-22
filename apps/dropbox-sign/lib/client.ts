import type { HookContext } from "@w6w/types";

/**
 * Dropbox Sign's v3 REST API — verified against the **official** OpenAPI
 * document (`github.com/hellosign/hellosign-openapi`, description "Official
 * Dropbox Sign OpenAPI Spec", `openapi.yaml` fetched 2026-08-18, 590KB), whose
 * `servers` block states `https://api.hellosign.com/v3`.
 *
 * The `hellosign.com` domain is not a legacy alias to be tidied up: the product
 * was renamed from HelloSign to Dropbox Sign, but the API host was not.
 * Measured 2026-08-18, `api.hellosign.com` is live and `api.sign.dropbox.com`
 * does not resolve.
 */
export const API_URL = "https://api.hellosign.com/v3";

/**
 * OAuth lives on a **different host and outside `/v3`**.
 *
 * The spec places `/oauth/token` among the paths, which — under its own
 * `servers` entry — resolves to `https://api.hellosign.com/v3/oauth/token`.
 * That URL does not exist. Measured 2026-08-18:
 *
 *   POST https://api.hellosign.com/v3/oauth/token  -> 404
 *       {"error":{"error_msg":"Invalid URI...","error_name":"not_found"}}
 *   POST https://app.hellosign.com/oauth/token     -> 400
 *       {"error":"invalid_request","error_description":"Either the combo
 *        client_id/code is wrong or this request was made more than 1 hour
 *        after the inital grant"}
 *
 * The second is the real endpoint: it answers with an OAuth error envelope
 * about the credentials it was given, which is what an endpoint that *exists*
 * does with a bad grant. `app.hellosign.com` is in the allowlist for this
 * reason and this reason only — no action calls it.
 */
export const OAUTH_HOST = "https://app.hellosign.com";
export const OAUTH_AUTHORIZE_URL = `${OAUTH_HOST}/oauth/authorize`;
export const OAUTH_TOKEN_URL = `${OAUTH_HOST}/oauth/token`;

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset so a PUT does not clear untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
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

/**
 * Dropbox Sign takes booleans as `true`/`false` in JSON but documents
 * `test_mode` as `1`/`0` in its form-encoded examples. JSON booleans are what
 * the schema declares, so that is what this app sends — but the coercion is
 * centralized here so "the box was ticked" can never arrive as the string
 * `"false"`, which is truthy.
 */
export function bool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.trim().toLowerCase() === "true" || value === "1";
  return false;
}

/**
 * The signer list, normalized.
 *
 * Signers are the one input worth validating locally, because getting them
 * wrong is *quiet*: a request sent to the wrong address is still a valid,
 * legally binding request, and a missing name reaches the recipient as a blank
 * greeting rather than an error.
 *
 * The two send paths identify signers differently and the API does not always
 * complain when you mix them up:
 *
 *   - `signature-request-send` (files) → signers are positional, optionally
 *     with an `order`.
 *   - `signature-request-send-with-template` → each signer must carry the
 *     `role` name defined in the template. An `order` there is ignored.
 *
 * So `requireRole` is passed by the template path, and the check happens before
 * anything is sent.
 */
export interface Signer {
  email_address: string;
  name: string;
  role?: string;
  order?: number;
  pin?: string;
  sms_phone_number?: string;
}

export function parseSigners(value: unknown, requireRole: boolean): Signer[] {
  const parsed = json(value, "signers");
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("`signers` is required — a non-empty array of signer objects");
  }
  return parsed.map((raw, i) => {
    const s = raw as Record<string, unknown>;
    const email = String(s.email_address ?? s.email ?? "").trim();
    const name = String(s.name ?? "").trim();
    if (!email) throw new Error(`signer ${i} has no \`email_address\``);
    if (!name) throw new Error(`signer ${i} has no \`name\``);
    if (requireRole && !String(s.role ?? "").trim()) {
      throw new Error(
        `signer ${i} has no \`role\` — a template identifies its signers by role name, ` +
          "not by position",
      );
    }
    // `email` is accepted as an alias but never forwarded — Dropbox Sign takes
    // `email_address`, and passing both would send it a key it does not know.
    const { email: _alias, ...rest } = s;
    return compact({ ...rest, email_address: email, name }) as unknown as Signer;
  });
}

/**
 * Rate-limit headers, read from a live response.
 *
 * **The spec's header names are wrong for one of the three.** It declares
 * `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-Ratelimit-Reset`.
 * Measured 2026-08-18 against `api.hellosign.com`, the wire carries:
 *
 *   x-ratelimit-limit: 100
 *   x-ratelimit-limit-remaining: 97      <- not `x-ratelimit-remaining`
 *   x-ratelimit-reset: 1787051516
 *
 * A quota check written from the spec alone would read `x-ratelimit-remaining`,
 * find nothing, and report `unknown` forever. Both spellings are read, the
 * measured one first, so this keeps working if Dropbox Sign ever aligns the
 * wire with its own document.
 *
 * The headers also do **not** appear on a `401`: measured, an unauthenticated
 * `GET /v3/account` carries none of them, while a `404` from the same host
 * carries all three. They are emitted past the auth tier, so only an
 * authenticated call can read them.
 */
export interface RateLimit {
  limit?: number;
  remaining?: number;
  reset?: number;
}

export function readRateLimit(headers: Headers): RateLimit {
  const num = (...names: string[]): number | undefined => {
    for (const name of names) {
      const raw = headers.get(name);
      if (raw === null || raw.trim() === "") continue;
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  };
  return {
    limit: num("x-ratelimit-limit"),
    remaining: num("x-ratelimit-limit-remaining", "x-ratelimit-remaining"),
    reset: num("x-ratelimit-reset"),
  };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class DropboxSignClient {
  constructor(private ctx: HookContext) {}

  /** The last response's rate-limit headers, for actions that want to log them. */
  lastRateLimit: RateLimit = {};

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    this.lastRateLimit = readRateLimit(res.headers);
    if (!res.ok) {
      // Dropbox Sign's envelope is `{"error": {"error_msg", "error_name"}}`.
      // `error_name` is the machine-readable half — `unauthorized`,
      // `not_found`, `bad_request`, `exceeded_rate` — and `error_msg` is the
      // sentence a human needs, so both are surfaced verbatim.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Dropbox Sign ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Dropbox Sign's **1-based page** pagination, collecting one named
   * collection.
   *
   * The list endpoints answer with `{list_info: {num_pages, num_results, page,
   * page_size}, <collection>: [...]}`. Pages start at **1**, not 0 — a loop
   * that starts at 0 gets page 1 back and then asks for page 1 again, which
   * silently duplicates the first page rather than erroring.
   */
  async requestAll<T = unknown>(
    path: string,
    collectionKey: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    let numPages = 1;
    while (items.length < wantTotal) {
      const pageSize = Math.min(100, Math.max(1, wantTotal - items.length));
      const body = await this.request<Record<string, unknown>>(path, {
        ...options,
        query: { ...options.query, page, page_size: pageSize },
      });
      const chunk = (body?.[collectionKey] as T[] | undefined) ?? [];
      items.push(...chunk);
      const info = (body?.list_info ?? {}) as { num_pages?: number };
      numPages = Number(info.num_pages ?? 1);
      if (chunk.length === 0 || page >= numPages) break;
      page += 1;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
