import type { HookContext } from "@w6w/types";

/**
 * Sharetribe Integration API client, plus the Authentication API constants the
 * auth method needs to mint a token.
 *
 * Everything in this module was verified on 2026-09-29 against Sharetribe's own hand-written
 * API reference (`sharetribe.com/api-reference/{index,integration,authentication,
 * asset-delivery-api}.html` — there is no machine-readable OpenAPI document, the same class of
 * docs-only vendor as this pack's `cloudconvert` app) plus live probes against
 * `flex-integ-api.sharetribe.com` and `flex-api.sharetribe.com`.
 *
 * ## Two hosts, not one — and neither is per-tenant
 *
 * Sharetribe's reference splits into a **Marketplace API** (what a marketplace's own end-user
 * client authenticates against, as a single logged-in user or anonymously) and an
 * **Integration API** (a trusted, server-side surface with full read/write access to all
 * marketplace data — "applications that run in your own backend systems", the vendor's own
 * words). This app covers the Integration API only; see `auth/integration-app.ts` for why the
 * Marketplace API's own auth model (a marketplace user's own email/password, or an anonymous
 * `public-read` token) does not fit a workflow-host credential.
 *
 * Critically, **neither surface is addressed by a per-tenant hostname**: every marketplace on
 * Sharetribe is reached through exactly the same two fixed hosts —
 * `flex-api.sharetribe.com` (Authentication API *and* Marketplace API) and
 * `flex-integ-api.sharetribe.com` (Integration API) — and the marketplace itself is identified
 * by which `client_id`/`client_secret` pair the caller authenticates with, not by subdomain or
 * path segment. So, unlike an app whose manifest has to fall back to a `*.vendor.com` wildcard
 * or leave a surface out entirely, both hosts here are ordinary exact `network.allow` entries.
 * (The read-only Asset Delivery API is a *third*, separate fixed host — `cdn.st-api.com` — see
 * `lib/asset-client.ts`.)
 *
 * ## Response envelope
 *
 * Every endpoint answers `{data, included?, meta?}` on success. `data` is a single resource
 * object (`{id, type, attributes, relationships?}`) for a `show`/command endpoint, or an array
 * for a `query` endpoint. `meta` carries pagination (`totalItems`, `totalPages`, `page`,
 * `perPage`, and `paginationLimit`/`paginationUnsupported` when relevant).
 *
 * **Command (`POST`) endpoints return only a resource reference (`{id, type}`) by default** —
 * no `attributes`. The documented escape hatch is `?expand=true`, which this client sends on
 * every command so a workflow step actually has something to chain on; a caller who only
 * wanted the reference can ignore the extra fields.
 *
 * ## Errors
 *
 * Every failure is `{"errors": [{"id", "status", "code", "title", "details"?, "source"?}]}` —
 * shared with the Marketplace API and documented once in the reference's "Errors" section. The
 * array can hold more than one entry (e.g. several `validation-*` failures on one request), so
 * {@link formatSharetribeError} joins every entry's `code`/`title`/`details` rather than reading
 * only the first. A 5xx response is documented as "not guaranteed to have a valid JSON body", so
 * parsing always falls back to the raw text.
 */

/** Authentication API — also fronts the Marketplace API. Not used for Integration API calls. */
export const AUTH_BASE = "https://flex-api.sharetribe.com";
export const AUTH_TOKEN_PATH = "/v1/auth/token";

/** Integration API — the host every action in this app calls. */
export const API_BASE = "https://flex-integ-api.sharetribe.com";
export const API_PREFIX = "/v1/integration_api";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export interface SharetribeListMeta {
  totalItems?: number | null;
  totalPages?: number | null;
  page?: number;
  perPage?: number;
  paginationLimit?: number;
  paginationUnsupported?: boolean;
}

export interface SharetribeEnvelope<T> {
  data: T;
  included?: unknown[];
  meta?: SharetribeListMeta;
}

interface SharetribeErrorEntry {
  id?: string;
  status?: number;
  code?: string;
  title?: string;
  details?: string;
  source?: { path?: string[]; type?: string };
}

interface SharetribeErrorBody {
  errors?: SharetribeErrorEntry[];
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values here. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a `multiselect`/comma-list param into Sharetribe's comma-separated string form. */
export function toCommaList(v: string[] | string | undefined | null): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items.join(",") : undefined;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Keep an error message readable — a validation body can carry several entries. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Sharetribe's `{errors: [...]}` body into one actionable line.
 *
 * Every entry's `code` is kept — it is what the vendor's own error-code reference
 * (`api-error-codes.html`) is written against, and `conflict`-class codes like
 * `user-is-banned`/`listing-invalid-state`/`transaction-locked` name a specific, actionable
 * cause that a flattened "HTTP 409" would hide.
 */
export function formatSharetribeError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: SharetribeErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as SharetribeErrorBody;
  } catch { /* 5xx responses are not guaranteed to be JSON — fall through to the raw body */ }

  const errors = parsed?.errors;
  if (!errors || errors.length === 0) {
    return `Sharetribe ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const lines = errors.map((e) => {
    const source = e.source?.path?.length
      ? ` (${e.source.type ?? "field"}: ${e.source.path.join(".")})`
      : "";
    return [e.code ?? "error", e.title, e.details].filter(Boolean).join(" — ") + source;
  });
  return truncate(`Sharetribe ${status} for ${method} ${path}: ${lines.join("; ")}`, 1000);
}

export class SharetribeClient {
  constructor(private ctx: HookContext) {}

  /** `GET .../show` — a single resource, unwrapped from its `{data}` envelope. */
  async show<T = unknown>(path: string, query: Record<string, QueryValue> = {}): Promise<T> {
    const body = await this.send<T>(path, { method: "GET", query });
    return body.data;
  }

  /** `GET .../query` — the full envelope (`data` array, plus `meta` for pagination). */
  query<T = unknown>(
    path: string,
    query: Record<string, QueryValue> = {},
  ): Promise<SharetribeEnvelope<T[]>> {
    return this.send<T[]>(path, { method: "GET", query });
  }

  /**
   * `POST` a command endpoint — a single resource, unwrapped.
   *
   * Always sends `expand=true` — see the module doc's "Response envelope" section for why a
   * bare resource reference is the wrong default for a workflow step.
   */
  async command<T = unknown>(
    path: string,
    body: unknown,
    query: Record<string, QueryValue> = {},
  ): Promise<T> {
    const res = await this.send<T>(path, {
      method: "POST",
      query: { ...query, expand: true },
      body,
    });
    return res.data;
  }

  private async send<T>(path: string, options: RequestOptions): Promise<SharetribeEnvelope<T>> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatSharetribeError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return { data: undefined as T };
    return JSON.parse(text) as SharetribeEnvelope<T>;
  }
}
