import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Duda Partner API client.
 *
 * Everything in this module was checked on 2026-09-22 against Duda's own
 * developer documentation (`developer.duda.co` — its machine-readable mirror at
 * `<page-url>.md` embeds each endpoint's real OpenAPI 3.x fragment under an
 * "OpenAPI definition" heading) plus live `curl` probes against both regional
 * hosts. Nothing here came from a third-party integration directory.
 *
 * ## Two hosts, and the manifest can enumerate both
 *
 * Every endpoint fragment declares the same two servers, and both answer live:
 *
 *     { "url": "https://api.duda.co",    "description": "Production (US)" }
 *     { "url": "https://api.eu.duda.co", "description": "Production (EU)" }
 *
 * A Duda account is provisioned in exactly one of them, and a credential from
 * one region is rejected by the other. Unlike a per-tenant host (Zendesk's
 * `acme.zendesk.com`) this is a **bounded set of two known hostnames**, so the
 * manifest lists both and the choice is a Connection-level `region` field —
 * the same shape `amplitude` uses for its US/EU split. `region` lives on the
 * Auth method, `afterConnect` records it on the connection's redacted
 * `display`, and this module reads it back from there, so no Action ever takes
 * a region parameter or sees a credential.
 *
 * ## One prefix, two dialects
 *
 * The paths are given here as the full effective path — `/api` + the
 * documented path — so a caller appends nothing. Note that Duda's docs are
 * served from two OpenAPI documents that disagree about how to write them: the
 * main Partner API document (3.0.1) publishes `/api/...` paths and two servers,
 * while the Collections pages (3.1.0) publish `/sites/multiscreen/...` paths
 * against the single server `https://api.duda.co/api`. Both are the same API on
 * the wire, which is why {@link API_PREFIX} exists here rather than in the
 * Actions.
 */

/** The US production host — Duda's documented default, and most accounts. */
export const US_BASE = "https://api.duda.co";

/** The EU production host. Same API, separate data centre. */
export const EU_BASE = "https://api.eu.duda.co";

/** Every documented path carries this prefix (`/api/sites/multiscreen`, …). */
export const API_PREFIX = "/api";

export type Region = "US" | "EU";

/** Host per region. Both are declared in `w6w.network.allow`. */
export const HOSTS: Record<Region, string> = { US: US_BASE, EU: EU_BASE };

/**
 * Duda's docs state that "all endpoints require a user-agent header to be
 * present", and that helper libraries which add one are fine. Deno's `fetch`
 * does not send one of its own, so the client sends an explicit, honest one
 * rather than depending on whatever the host's `ctx.fetch` happens to do.
 */
export const USER_AGENT = "w6w-duda/0.1.0";

/** Normalise a `region` field or display value onto the two real regions. */
export function regionOf(value: unknown): Region {
  return String(value ?? "US").trim().toUpperCase() === "EU" ? "EU" : "US";
}

/** Public (credential-free) connection metadata this app records. */
export interface DudaConnectionDisplay {
  region?: string;
}

/**
 * Read the region off the redacted Connection.
 *
 * `afterConnect` always records it, so a missing value means an older
 * connection or a host that dropped the display data — and since US is Duda's
 * documented default, that case resolves to US rather than throwing in the
 * middle of an Action.
 */
export function regionFromConnection(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as DudaConnectionDisplay;
  return regionOf(display.region);
}

/** The origin for a region — `https://api.duda.co` or `https://api.eu.duda.co`. */
export function baseUrl(region: Region | string | undefined): string {
  return HOSTS[regionOf(region)];
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON. Arrays are fine — the row endpoints take a raw array. */
  body?: unknown;
}

/** Drop keys the caller left unset, so an omitted optional never becomes `""`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/**
 * A `json`-typed param arrives either as a live value or as the text the user
 * typed, depending on the host's form handling — accept both.
 */
export function jsonParam(value: unknown, field: string): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * Duda takes its enum filters as csv (`publish_status=PUBLISHED,UNPUBLISHED`).
 * Accept a list too, in case the host supplies the field as repeated values.
 */
export function csvParam(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    const joined = value.map((v) => String(v).trim()).filter(Boolean).join(",");
    return joined || undefined;
  }
  return String(value);
}

/** URL-encode one path segment (site aliases and collection names are user text). */
export function seg(value: unknown): string {
  return encodeURIComponent(String(value));
}

/** Duda's shared error object, documented on every endpoint's 400/401/402/500. */
export interface ErrorRDT {
  error_code?:
    | "AccessForbidden"
    | "ResourceNotExist"
    | "ResourceAlreadyExist"
    | "InvalidInput"
    | "InvalidState"
    | "InternalError"
    | "UnAuthorized"
    | "TooManyRequests"
    | "EmailDomainNotValidated"
    | "InsufficientCredits";
  message?: string;
}

/** What the wrapper hands back: the status, and the parsed body when there is one. */
export interface DudaResponse<T> {
  status: number;
  data: T | undefined;
}

/**
 * Turn a failure into something actionable.
 *
 * `ErrorRDT` is what Duda actually returns for a non-401 error — the
 * vendor's own `error_code` is surfaced verbatim because the fix differs per
 * code (`ResourceNotExist` versus `InsufficientCredits`), and a flattened
 * "HTTP 400" hides which one it was.
 *
 * A 401 is the documented exception: measured live on 2026-09-22 against three
 * different paths and both regional hosts, Duda answers 401 with
 * `content-length: 0` — no body at all, only a `WWW-Authenticate: Basic
 * realm="DM API"` header. So there is nothing to parse there and the status
 * line is the whole story. See `auth/basic.ts` and the README's "Notes on the
 * API".
 */
export function describeFailure(
  status: number,
  statusText: string,
  method: string,
  path: string,
  text: string,
): string {
  const base = `Duda ${status}${statusText ? ` ${statusText}` : ""} for ${method} ${path}`;

  let body: ErrorRDT | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as ErrorRDT;
    } catch {
      body = null;
    }
  }

  if (status === 429) {
    return `${base}: too many requests. Duda enforces a hard 10 calls/second across the whole ` +
      "API — roughly one call every 125ms — plus lower per-endpoint minute ceilings (20/min for " +
      "publish and unpublish, 60/min for create-site and create-account, 300/min for form " +
      "submissions). Space the calls out; there is no quota endpoint or rate-limit header to " +
      "read.";
  }
  if (body?.error_code || body?.message) {
    const code = body.error_code ? `${body.error_code}: ` : "";
    return `${base}: ${code}${body.message ?? ""}`.trim();
  }
  // Empty body — the 401 case. It proves the host was reached and answered.
  return base;
}

/**
 * The wrapper every Action and health check goes through: build the URL from
 * the region, add query params, serialize a JSON body, call `ctx.fetch`, parse
 * the JSON, and surface the vendor's own error fields on a non-2xx.
 *
 * It never sets `authorization` — the runtime routes every request through the
 * Auth `sign` hook.
 */
export async function request<T = unknown>(
  ctx: HookContext,
  region: Region | string | undefined,
  path: string,
  options: RequestOptions = {},
): Promise<DudaResponse<T>> {
  const url = new URL(`${baseUrl(region)}${path}`);
  for (const [k, v] of Object.entries(options.query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const method = (options.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    accept: "application/json",
    "user-agent": USER_AGENT,
  };
  const init: RequestInit = { method, headers };
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  const res = await ctx.fetch(url.toString(), init);
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(describeFailure(res.status, res.statusText, method, url.pathname, text));
  }
  if (res.status === 204 || !text) return { status: res.status, data: undefined };
  try {
    return { status: res.status, data: JSON.parse(text) as T };
  } catch {
    throw new Error(
      `Duda did not return JSON for ${method} ${url.pathname}: ${text.slice(0, 160)}`,
    );
  }
}

/**
 * Per-call client, used by every Action.
 *
 * ```ts
 * const pages = await new DudaClient(ctx).request("/api/sites/multiscreen/x/pages");
 * ```
 */
export class DudaClient {
  /** The region the Connection was recorded with. */
  readonly region: Region;

  constructor(private ctx: HookContext) {
    this.region = regionFromConnection(ctx.connection);
  }

  /** The body, unwrapped. Throws on any non-2xx. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return (await request<T>(this.ctx, this.region, path, options)).data as T;
  }

  /** Status plus body, for the endpoints whose success is a bare `204`. */
  send<T = unknown>(path: string, options: RequestOptions = {}): Promise<DudaResponse<T>> {
    return request<T>(this.ctx, this.region, path, options);
  }
}
