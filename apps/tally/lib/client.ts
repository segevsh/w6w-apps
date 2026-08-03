/**
 * Tally's REST API. Verified against the vendor's own OpenAPI document at
 * `https://developers.tally.so/api-reference/openapi.json` (fetched 2026-08-03),
 * cross-read against the prose reference at `https://developers.tally.so` and
 * the product help page at `https://tally.so/help/api`.
 *
 * ## Host
 *
 * One host, no regions and no per-tenant subdomains: the OpenAPI `servers`
 * block lists exactly `https://api.tally.so`, and the introduction states the
 * API "is accessible only via HTTPS". That is why `w6w.network.allow` is a
 * single entry and needs no wildcard.
 *
 * ## Envelope
 *
 * There is no uniform wrapper — each endpoint returns its resource directly.
 * The paginated *collection* endpoints share one shape:
 *
 * ```json
 * { "items": [...], "page": 1, "limit": 50, "total": 120, "hasMore": true }
 * ```
 *
 * with three documented departures from it, all reproduced faithfully rather
 * than normalised away, because a caller filtering on them needs the real
 * field names:
 *
 *   - `GET /forms/{id}/submissions` — `questions` + `submissions` instead of
 *     `items`, no `total`, and a `totalNumberOfSubmissionsPerFilter` breakdown.
 *   - `GET /webhooks` — `webhooks` instead of `items`.
 *   - `GET /webhooks/{id}/events` — `events` instead of `items`, with
 *     `totalNumberOfEvents`.
 *
 * `GET /workspaces/{id}/folders` and `GET /organizations/{id}/users` are not
 * paginated at all — they return a bare JSON array.
 *
 * ## Versioning
 *
 * Tally versions by date through a `tally-version` request header
 * (e.g. `2025-02-01`). Omitting it is well-defined: the docs state a key is
 * "tied by default to the latest version of the API" at creation time. So the
 * header is sent only when a Connection recorded one, and left off otherwise —
 * pinning a version the user did not ask for would silently change behaviour.
 *
 * ## Errors
 *
 * Documented statuses are 400 / 401 / 403 / 404 / 429 / 500. The body is NOT
 * reliably JSON — an unauthenticated `GET /users/me` answers `text/plain`
 * with `Unauthorized` (verified live 2026-08-03) — so this client tries JSON,
 * then falls back to the raw text.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

/** Tally's single documented API host. */
export const API_HOST = "api.tally.so";

export const BASE_URL = `https://${API_HOST}`;

/** The date-versioning request header. */
export const VERSION_HEADER = "tally-version";

/** `tally-version` values are plain calendar dates. */
export const VERSION_PATTERN = "^\\d{4}-\\d{2}-\\d{2}$";

/**
 * The API version this Connection pinned, if any. `display` is redacted
 * Connection metadata recorded by the auth method's `afterConnect` hook — never
 * the credential.
 */
export function apiVersionFromConnection(
  connection: RedactedConnection | undefined,
): string | undefined {
  const display = (connection?.display ?? {}) as { apiVersion?: unknown };
  const version = display.apiVersion;
  return typeof version === "string" && version !== "" ? version : undefined;
}

/** The shape shared by Tally's paginated collection endpoints. */
export interface ListEnvelope<T = unknown> {
  items?: T[];
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Array values are emitted as repeated `key=` pairs, per the OpenAPI `type: array` params. */
  query?: Record<string, QueryValue | readonly QueryValue[]>;
  /** JSON request body. Every Tally write endpoint is `application/json`. */
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets an `Authorization` header — the
 * runtime routes every request through the auth `sign` hook, which injects the
 * bearer token.
 */
export class TallyClient {
  constructor(private ctx: HookContext) {}

  /** The `tally-version` this Connection pinned, if it pinned one. */
  get apiVersion(): string | undefined {
    return apiVersionFromConnection(this.ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === undefined || item === null || item === "") continue;
          url.searchParams.append(key, String(item));
        }
        continue;
      }
      url.searchParams.set(key, String(value));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const version = this.apiVersion;
    if (version) headers[VERSION_HEADER] = version;

    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();

    if (!res.ok) {
      throw new Error(
        `Tally ${res.status} for ${method} ${url.pathname}: ${errorMessage(text, res)}`,
      );
    }

    // 204 and other empty successes are real: DELETE endpoints return no body.
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }
}

/**
 * Best-effort human message from an error body. Tally returns JSON on some
 * failures and bare text on others, so both are handled rather than assuming
 * the friendlier one.
 */
export function errorMessage(text: string, res: { statusText?: string }): string {
  if (text) {
    try {
      const body = JSON.parse(text) as Record<string, unknown>;
      for (const key of ["message", "error_description", "error", "detail"]) {
        const value = body[key];
        if (typeof value === "string" && value !== "") return value;
      }
    } catch {
      // Not JSON — fall through to the raw text.
    }
    return text.slice(0, 200);
  }
  return res.statusText || "no response body";
}
