import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Algolia's Search API — verified against Algolia's own OpenAPI document
 * (https://raw.githubusercontent.com/algolia/api-clients-automation/main/specs/bundled/search.yml,
 * "Search API" v1.0.0, 60 paths, fetched 2026-08-18; the `algolia` org's own
 * monorepo of "the Algolia API specs and their auto-generated clients", not a
 * fork).
 *
 * **The host is per-application.** The document's `servers` are
 * `https://{appId}.algolia.net` and `https://{appId}-dsn.algolia.net`, plus
 * `https://{appId}-{1,2,3}.algolianet.com` as retry fallbacks — so no manifest
 * can enumerate them and the egress allowlist is `*.algolia.net` +
 * `*.algolianet.com`.
 *
 * **Reads and writes go to different hosts.** Algolia's clients send reads
 * through the DSN host (`{appId}-dsn.algolia.net`), which is geo-replicated,
 * and writes to the primary (`{appId}.algolia.net`). The spec marks the read
 * operations `x-use-read-transporter`. This client honours that split.
 *
 * What it deliberately does **not** do is Algolia's retry strategy: an SDK
 * falls back across the three `algolianet.com` hosts when the primary is
 * unreachable. An action is a single request with a host-level timeout, so a
 * failure surfaces as a failure rather than being silently retried elsewhere.
 */
export const READ_HOST = (appId: string) => `https://${appId}-dsn.algolia.net`;
export const WRITE_HOST = (appId: string) => `https://${appId}.algolia.net`;

/**
 * Note on case: Algolia application ids are uppercase, and building a request
 * through `URL` lowercases the host — `APPID.algolia.net` goes on the wire as
 * `appid.algolia.net`. That is the WHATWG URL spec's host normalisation, not a
 * bug, and it reaches the same server because DNS names are case-insensitive
 * (RFC 4343). Every URL-based HTTP client does the same thing. The id is still
 * sent verbatim in the `x-algolia-application-id` header, which is what Algolia
 * authenticates against.
 */

/** Public (redacted-safe) connection metadata. */
export interface AlgoliaConnectionDisplay {
  /** The Algolia application id — it is the hostname, so actions need it. */
  appId?: string;
}

/** Resolve the application id from the Connection's public metadata. */
export function resolveAppId(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as AlgoliaConnectionDisplay;
  const appId = display.appId?.trim();
  if (!appId) {
    throw new Error(
      "Algolia connection records no application id — reconnect so one can be recorded.",
    );
  }
  return appId;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /**
   * Which host to use. Reads go to the geo-replicated DSN host, writes to the
   * primary — the split Algolia's own clients make.
   */
  read?: boolean;
}

/** Drop keys the caller left unset so a partial update doesn't clear fields. */
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
 * Parse a JSON param that must be an object — the shape every record action
 * takes. Named separately so the error says "must be a JSON object" rather
 * than letting an array through to a confusing 400.
 */
export function jsonObject(value: unknown, field: string): Record<string, unknown> | undefined {
  const parsed = json(value, field);
  if (parsed === undefined) return undefined;
  if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
    throw new Error(`\`${field}\` must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the credential headers — the
 * runtime routes every request through the auth `sign` hook, which stamps both
 * `x-algolia-application-id` and `x-algolia-api-key`.
 */
export class AlgoliaClient {
  private appId: string;

  constructor(private ctx: HookContext) {
    this.appId = resolveAppId(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const base = options.read ? READ_HOST(this.appId) : WRITE_HOST(this.appId);
    const url = new URL(`${base}${path}`);
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
    if (!res.ok) {
      // Algolia answers `{ "message": "...", "status": 4xx }`, and the message
      // names the ACL a key is missing when that is the problem.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Algolia ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
