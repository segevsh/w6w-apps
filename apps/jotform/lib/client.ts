/**
 * Jotform's REST API. Verified against the vendor's own docs at
 * `https://api.jotform.com/docs/` (fetched 2026-08-03) and cross-checked
 * against Jotform's official clients `jotform/jotform-api-nodejs` and
 * `jotform/jotform-api-python`.
 *
 * ## Regions
 *
 * Jotform serves the same API from three hosts, and an account lives on
 * exactly one of them:
 *
 *   - `api.jotform.com`        — default (US)
 *   - `eu-api.jotform.com`     — EU data-residency accounts
 *   - `hipaa-api.jotform.com`  — HIPAA-compliant accounts
 *
 * All three are documented on the API docs' authentication section and are
 * the same three the vendor's own integrations enumerate. The region is a
 * property of the ACCOUNT, not of an individual call, so it is collected once
 * as an Auth field and echoed onto the Connection's redacted display data by
 * `afterConnect` — which is where this client reads it from. Actions never
 * see the credential, only that display value.
 *
 * Jotform Enterprise instances answer on a customer's own domain. Those are
 * deliberately NOT supported: covering them would mean a `"*"` egress
 * allowlist, and this app is not worth that.
 *
 * ## Envelope
 *
 * Every response — success or failure — is wrapped:
 *
 * ```json
 * { "responseCode": 200, "message": "success", "content": …,
 *   "resultSet": { "offset": 0, "limit": 20, "count": 20 },
 *   "limit-left": 4986 }
 * ```
 *
 * `responseCode` mirrors the HTTP status (confirmed live: an unauthenticated
 * `GET /user` answers HTTP 401 with `responseCode: 401`), but the official
 * Node client checks it independently of the transport status, so this client
 * does too. `limit-left` is the number of daily API calls still available and
 * rides on EVERY response — it is what the `quota` health check reads.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

/** Jotform's three documented API hosts, keyed by the value stored on the Connection. */
export const API_HOSTS = {
  us: "api.jotform.com",
  eu: "eu-api.jotform.com",
  hipaa: "hipaa-api.jotform.com",
} as const;

export type Region = keyof typeof API_HOSTS;

export const DEFAULT_REGION: Region = "us";

/** Map a stored region key onto its host, falling back to the default (US) host. */
export function hostForRegion(region: string | undefined): string {
  return API_HOSTS[(region ?? DEFAULT_REGION) as Region] ?? API_HOSTS[DEFAULT_REGION];
}

export function baseUrl(host: string): string {
  return `https://${host}`;
}

/**
 * The API host for this Connection. `display` is redacted Connection metadata
 * recorded by the auth method's `afterConnect` hook — never the credential.
 */
export function hostFromConnection(connection: RedactedConnection | undefined): string {
  const known: readonly string[] = Object.values(API_HOSTS);
  const display = (connection?.display ?? {}) as { apiHost?: string; region?: string };
  if (display.apiHost && known.includes(display.apiHost)) return display.apiHost;
  return hostForRegion(display.region);
}

/** Jotform's uniform response wrapper. */
export interface JotformEnvelope<T = unknown> {
  responseCode?: number;
  message?: string;
  content: T;
  /** Present on the paginated list endpoints. */
  resultSet?: {
    offset?: number;
    limit?: number;
    count?: number;
    orderby?: string;
    filter?: unknown;
  };
  /** Daily API calls remaining, normalised from the wire's `limit-left`. */
  limitLeft?: number;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /**
   * `application/x-www-form-urlencoded` body. Jotform's write endpoints are
   * form-encoded, not JSON — every POST example in the docs uses `-d key=value`.
   */
  form?: Record<string, string>;
}

/**
 * Jotform's `filter` query param is a JSON object serialised into the query
 * string, e.g. `filter={"created_at:gt":"2013-01-01 00:00:00"}`. Accept either
 * a ready-made string or an object.
 */
export function serializeFilter(filter: unknown): string | undefined {
  if (filter === undefined || filter === null || filter === "") return undefined;
  if (typeof filter === "string") return filter;
  return JSON.stringify(filter);
}

/**
 * Flatten an answers map into Jotform's `submission[...]` form fields, exactly
 * as the docs' own examples show:
 *
 *   `-d "submission[1]=answer of Question 1"`
 *   `-d "submission[2_first]=First Name"`
 *
 * Keys are passed through verbatim, so both the flat `"2_first"` form from the
 * docs and plain question ids work. Array values are emitted as repeated
 * `submission[key][]` entries — the same PHP-style bracket convention Jotform's
 * own form-encoded payloads use for lists (`questions[0][type]`). Nested
 * objects are rejected rather than guessed at: use the documented `qid_sublabel`
 * key form instead.
 */
export function submissionFields(
  answers: Record<string, unknown>,
  prefix = "submission",
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        out[`${prefix}[${key}][${i}]`] = String(item);
      });
      continue;
    }
    if (typeof value === "object") {
      throw new Error(
        `Jotform answer "${key}" is a nested object. Use the documented flat key form ` +
          `(e.g. "${key}_first") or an array of scalars.`,
      );
    }
    out[`${prefix}[${key}]`] = String(value);
  }
  return out;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets an auth header — the runtime routes
 * every request through the auth `sign` hook, which injects `APIKEY`.
 */
export class JotformClient {
  constructor(private ctx: HookContext) {}

  /** The host this Connection's account lives on. */
  get host(): string {
    return hostFromConnection(this.ctx.connection);
  }

  /** Issue a request and return the full Jotform envelope. */
  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<JotformEnvelope<T>> {
    const method = (options.method ?? "GET").toUpperCase();
    const url = new URL(`${baseUrl(this.host)}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const init: RequestInit = { method, headers: { accept: "application/json" } };
    if (options.form) {
      const body = new URLSearchParams();
      for (const [k, v] of Object.entries(options.form)) body.set(k, v);
      (init.headers as Record<string, string>)["content-type"] =
        "application/x-www-form-urlencoded";
      init.body = body.toString();
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();

    let parsed: Record<string, unknown> | undefined;
    if (text) {
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        // Non-JSON body — fall through to the status-only error below.
      }
    }

    const code = typeof parsed?.responseCode === "number" ? parsed.responseCode : undefined;
    const message = typeof parsed?.message === "string" ? parsed.message : undefined;

    // Jotform mirrors `responseCode` onto the HTTP status, but the vendor's own
    // Node client validates the envelope code independently — so do both.
    const failed = !res.ok || (code !== undefined && (code < 200 || code > 299));
    if (failed) {
      throw new Error(
        `Jotform ${code ?? res.status} for ${method} ${url.pathname}: ${
          message ?? (text ? text.slice(0, 200) : res.statusText)
        }`,
      );
    }

    const limitLeft = parsed?.["limit-left"];
    return {
      responseCode: code,
      message,
      content: (parsed?.content ?? undefined) as T,
      resultSet: parsed?.resultSet as JotformEnvelope<T>["resultSet"],
      limitLeft: typeof limitLeft === "number" ? limitLeft : undefined,
    };
  }

  /** Issue a request and return just the unwrapped `content`. */
  async content<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { content } = await this.request<T>(path, options);
    return content;
  }
}
