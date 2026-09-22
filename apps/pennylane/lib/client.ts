import type { HookContext } from "@w6w/types";

/**
 * Pennylane Company API v2 client — `https://app.pennylane.com/api/external/v2`.
 *
 * Every path, verb, query parameter, body field and error shape in this file
 * was read from Pennylane's own API reference (`pennylane.readme.io`, which
 * serves clean Markdown at `<page>.md`) on 2026-09-22. Each endpoint's page
 * embeds its own OpenAPI document, and the `servers` block of every one of them
 * names `https://app.pennylane.com` — one origin, one path prefix, no regional
 * or sandbox host.
 *
 * ## Authentication is not done here
 *
 * This client never sets an `Authorization` header. Every request routes
 * through the runtime's auth `sign` hook (see `auth/oauth2.ts`), which stamps
 * `Authorization: Bearer <access token>` — the header shape Pennylane's OAuth
 * walkthrough uses in its own `curl` examples. No action ever sees the token.
 *
 * ## Pagination: one envelope, returned whole
 *
 * Every list endpoint answers the same cursor envelope
 * (`docs/using-cursor-based-pagination.md`):
 *
 *     { "items": [...], "has_more": true, "next_cursor": "eyJpZCI6MTAwfQ==" }
 *
 * `next_cursor` is `null` at the end of a result set. Actions return this
 * envelope verbatim rather than walking pages — the host decides how far to
 * paginate, and the vendor's own documentation warns that the cursor carries no
 * filter state, so a caller re-sending `filter` on each page is a decision this
 * client must not make silently on its behalf.
 *
 * ## Errors: one documented schema, with a documented second shape on 409
 *
 * `docs/error-handling-status-codes.md` documents
 *
 *     { "error": "<code>", "message": "<human text>", "details": { ... }? }
 *
 * on 4xx/5xx, and says the `details` object is the most actionable part of a
 * `422`. A duplicate resource is the exception: the vendor's 409 answers
 * `{ "status": 409, "error": "<message>" }` — here `error` carries the human
 * text itself, so {@link formatPennylaneError} prints it either way rather than
 * showing an empty message.
 *
 * ## Rate limits
 *
 * 25 requests / 5 seconds **per token** (`docs/rate-limiting-1.md`), and every
 * response — not just a 429 — carries `ratelimit-limit`,
 * `ratelimit-remaining` and `ratelimit-reset`; only the 429 adds `retry-after`.
 * The client surfaces `retry-after` in the thrown message; `health/quota.ts`
 * reads the three always-present headers off the same `GET /me` call the
 * credential probe makes.
 */

/** The one and only API origin. */
export const API_URL = "https://app.pennylane.com/api/external/v2";

/** A query value the client knows how to put on the wire. */
export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Query string parameters. Falsy/undefined/empty values are dropped. */
  query?: Record<string, QueryValue>;
  /** JSON-encoded as the request body. Never sent on a GET. */
  body?: unknown;
}

/**
 * The cursor envelope every list endpoint returns, passed through whole.
 *
 * `items` is typed `unknown[]` because each action declares its own output
 * fields — the vendor's item schema is a `oneOf` (company vs individual
 * customer) that this app does not re-model.
 */
export interface ListEnvelope<T = unknown> {
  items: T[];
  has_more: boolean;
  next_cursor: string | null;
}

/** The documented failure body, as far as this formatter reads it. */
export interface PennylaneErrorBody {
  error?: string;
  message?: string;
  details?: unknown;
}

/**
 * An API failure that keeps the HTTP status, so an action can add
 * endpoint-specific meaning to a code.
 *
 * The one caller today is `send-customer-invoice-by-email`: Pennylane documents
 * its 409 as "the PDF has not been generated yet, retry in a few minutes",
 * which is a materially different instruction from the generic
 * duplicate-resource 409 the same status otherwise means.
 */
export class PennylaneApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "PennylaneApiError";
  }
}

function truncate(s: string, max = 500): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

/** Parse the documented error body. Returns `undefined` for a non-JSON body. */
export function parsePennylaneError(raw: string): PennylaneErrorBody | undefined {
  if (!raw.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;
    return parsed as PennylaneErrorBody;
  } catch {
    return undefined;
  }
}

/**
 * One line a human can act on, preferring the vendor's own `error`/`message`.
 *
 * The codes are surfaced verbatim because the fix differs per code: a `403`
 * means the OAuth grant is missing a scope the endpoint needs, a `422` carries
 * a `details` object naming the offending field, and a `429` is quota rather
 * than a bug — flattening all three into "HTTP 422" loses exactly the part that
 * says what to do.
 */
export function formatPennylaneError(
  status: number,
  method: string,
  path: string,
  raw: string,
  retryAfter?: string | null,
): string {
  const body = parsePennylaneError(raw);
  const parts = [`Pennylane ${status} for ${method} ${path}`];

  // `error` is a machine code in the documented schema and the human message in
  // the 409 duplicate shape — print it either way, then `message` when present.
  if (body?.error) parts.push(body.error);
  if (body?.message) parts.push(body.message);
  if (!body?.error && !body?.message) {
    parts.push(raw.trim() ? truncate(raw.trim()) : "empty body");
  }
  if (body?.details !== undefined) parts.push(`details: ${truncate(JSON.stringify(body.details))}`);

  if (status === 401) parts.push("the access token is missing, invalid or expired");
  if (status === 403) {
    parts.push("the granted scopes do not cover this endpoint");
  }
  if (status === 429) {
    parts.push(
      retryAfter
        ? `rate limited — retry after ${retryAfter}s`
        : "rate limited — Pennylane allows 25 requests / 5 seconds per token; retry with backoff",
    );
  }
  return truncate(parts.join(": "), 1000);
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * Builds the URL against {@link API_URL}, drops empty query values, JSON-encodes
 * a non-GET body, and throws a {@link PennylaneApiError} carrying the vendor's
 * own error text on a non-ok response. A `204` (the only bodyless success in
 * this surface — `send_by_email`) resolves to `undefined`.
 */
export class PennylaneClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const method = (options.method ?? "GET").toUpperCase();
    const init: RequestInit = { method, headers: { accept: "application/json" } };

    const bodyless = method === "GET" || method === "HEAD" || method === "DELETE";
    if (!bodyless && options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new PennylaneApiError(
        res.status,
        formatPennylaneError(
          res.status,
          method,
          url.pathname,
          detail,
          res.headers.get("retry-after"),
        ),
      );
    }
    if (res.status === 204) return undefined as T;
    return await res.json() as T;
  }
}
