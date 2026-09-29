import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * DocuSeal REST API client.
 *
 * Every path, query parameter, request/response field and error shape here
 * was verified against DocuSeal's own OpenAPI 3.1 document
 * (`https://console.docuseal.com/openapi.yml`, ~193KB, fetched 2026-09-29) and
 * live probes against both regional hosts.
 *
 * ## Two fixed hosts, not a per-tenant one
 *
 * The spec's `servers` block declares exactly two, both live:
 *
 *     https://api.docuseal.com   Global Server
 *     https://api.docuseal.eu    EU Server
 *
 * Unlike a per-tenant host (Zendesk's `acme.zendesk.com`), this is a bounded
 * set of two known hostnames, so both are declared in `w6w.network.allow` and
 * the choice is a Connection-level `region` field — the same shape this
 * pack's `duda` app (and, for the same reason, `amplitude`) uses for its own
 * US/EU split. That shape only works because DocuSeal's auth is a plain
 * `apiKey` header: nothing about the credential exchange is tied to a
 * specific host the way an OAuth2 authorization redirect is (contrast this
 * pack's `zohobooks`, which is forced into one `AuthDefinition` per data
 * centre precisely because the browser has already been sent to a specific
 * `accounts.zoho.<tld>` before any mid-flow field could be read). `region`
 * lives on the Auth method's fields, `afterConnect` records the resolved host
 * on the connection's redacted `display`, and this module reads it back from
 * there — no Action ever takes a region parameter or sees a credential.
 *
 * ## The error shape the spec never documents
 *
 * The OpenAPI document declares only `200` responses — not one path names a
 * `4xx` schema. Measured live 2026-09-29 against both hosts, an unauthenticated
 * or wrongly-authenticated request answers:
 *
 *     401 {"error":"Not authenticated"}
 *
 * identically whether the `X-Auth-Token` header is missing or simply wrong —
 * DocuSeal does not distinguish the two cases in the body, only a generic
 * `error` string. That string never echoes anything the caller sent, so it is
 * safe to surface verbatim.
 */

export type Region = "global" | "eu";

/** Host per region. Both are declared in `w6w.network.allow`. */
export const HOSTS: Record<Region, string> = {
  global: "api.docuseal.com",
  eu: "api.docuseal.eu",
};

/** Normalise a `region` field or display value onto the two real regions. Unknown → global. */
export function regionOf(value: unknown): Region {
  return String(value ?? "global").trim().toLowerCase() === "eu" ? "eu" : "global";
}

/** The origin for a region — `https://api.docuseal.com` or `https://api.docuseal.eu`. */
export function baseUrlFor(region: Region | string | undefined): string {
  return `https://${HOSTS[regionOf(region)]}`;
}

/** Public (credential-free) connection metadata this app records. */
export interface DocuSealConnectionDisplay {
  region?: string;
}

/**
 * Read the region off the redacted Connection.
 *
 * `afterConnect` always records it, so a missing value means an older
 * connection or a host that dropped the display data — that resolves to the
 * documented default (global) rather than throwing mid-Action.
 */
export function regionFromConnection(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as DocuSealConnectionDisplay;
  return regionOf(display.region);
}

/** The origin for this connection's region. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  return baseUrlFor(regionFromConnection(connection));
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

interface DocuSealErrorBody {
  error?: string;
}

/** Turn a DocuSeal error response into one actionable line, from its body — never the status alone. */
export function formatDocuSealError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: DocuSealErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as DocuSealErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (parsed?.error) {
    return `DocuSeal ${status} for ${method} ${path}: ${parsed.error}`;
  }
  const trimmed = raw.length > 600 ? `${raw.slice(0, 600)}… (${raw.length} bytes truncated)` : raw;
  return `DocuSeal ${status} for ${method} ${path}${trimmed ? `: ${trimmed}` : ""}`;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Parse a `json`-typed param, which arrives as either a live value or the
 * text a form field carried.
 */
export function asJson<T>(value: unknown, field: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`\`${field}\` is required and must be JSON.`);
  }
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`\`${field}\` is not valid JSON.`);
  }
}

/** Same as {@link asJson}, but an unset field is simply omitted rather than an error. */
export function asJsonOptional<T>(value: unknown, field: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return asJson<T>(value, field);
}

/** DocuSeal's cursor pagination envelope, carried on every list response. */
export interface DocuSealPagination {
  count?: number;
  next?: number | null;
  prev?: number | null;
}

export interface DocuSealList<T> {
  data: T[];
  pagination: DocuSealPagination;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `X-Auth-Token` — the runtime
 * routes every request through the auth `sign` hook.
 */
export class DocuSealClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
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
      throw new Error(formatDocuSealError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow DocuSeal's `after`-cursor pagination, collecting `data` up to
   * `wantTotal` items (default: everything). `pagination.next` is the id of
   * the item to resume from — the spec is explicit that it is meant to be
   * passed back verbatim as the next call's `after`. A `next` of `null` (or
   * absent), or an empty page, means there is nothing left; both are trusted
   * over a "page shorter than requested" heuristic, since the vendor's own
   * cursor is the authoritative signal.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let after: number | undefined;
    while (items.length < wantTotal) {
      const remaining = wantTotal - items.length;
      const limit = Number.isFinite(remaining) ? Math.min(100, Math.max(1, remaining)) : 100;
      const body = await this.request<DocuSealList<T>>(path, {
        ...options,
        query: { ...options.query, limit, after },
      });
      const chunk = body?.data ?? [];
      items.push(...chunk);
      const next = body?.pagination?.next;
      if (chunk.length === 0 || next === null || next === undefined) break;
      after = next;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
