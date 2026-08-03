import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Metabase REST client.
 *
 * ## There is no vendor API host — the instance IS the host
 *
 * Metabase is open source (AGPL-3.0 core, `metabase/metabase`) and is run both
 * as **Metabase Cloud** and as a self-hosted JAR / Docker container. Its own
 * OpenAPI document says so in the bluntest possible way: the single `servers`
 * entry in `docs/api.json` is
 *
 *     [{ "url": "http://localhost:3000", "description": "Localhost" }]
 *
 * — i.e. "wherever you put it". Every route lives under `<site>/api/…` on that
 * instance, on hosted and self-hosted alike.
 *
 * Two consequences, both deliberate:
 *
 *   - the manifest declares `network.allow: ["*"]`, exactly as the sibling
 *     `grist`, `discourse` and `wordpress` apps do, and for the same reason: the
 *     reachable host is the customer's own domain and cannot be enumerated in
 *     advance. Even a hosted-only allowlist would have to be
 *     `*.metabaseapp.com`, and would cost the entire self-hosted install base.
 *   - the site URL is an **Auth field**, not an Action param. An API key is
 *     minted on one instance and is valid on that instance only, so the URL and
 *     the key are two halves of one Connection. `afterConnect` republishes it on
 *     `connection.display.siteUrl`, and this module reads it from there — so the
 *     client can address the right host without ever seeing a credential.
 *
 * ## The status code you must not assume
 *
 * **Metabase answers a successful query with HTTP 202, not 200.** Query results
 * are served through `metabase.server.streaming-response`, whose default status
 * is literally `(or status 202)` (`streaming_response.clj`). Verified on the
 * wire against Metabase v0.63.2.7 on 2026-08-03:
 *
 *   | Call                                    | Status | Body                     |
 *   | --------------------------------------- | ------ | ------------------------ |
 *   | `POST /api/dataset` (good SQL)          | **202** | `{"status":"completed"}` |
 *   | `POST /api/dataset` (bad SQL)           | 400    | `{"status":"failed", …}` |
 *   | `POST /api/card/40/query`               | **202** | `{"status":"completed"}` |
 *   | `POST /api/card/40/query/csv`           | 200    | `text/csv`               |
 *   | `POST /api/card/40/query/json`          | 200    | `application/json`       |
 *
 * So the export formats are 200 and the JSON API format is 202. `res.ok` covers
 * both (200–299); `res.status === 200` would break every ad-hoc query in the
 * app. Nothing here compares against 200.
 *
 * ## The 2xx that means failure
 *
 * A query result carries its own verdict in the body. `query-result` in
 * Metabase's OpenAPI schema declares `status` as a **required** field with the
 * enum `["completed", "failed"]`, alongside an `error` string and an
 * `error_type`. On the happy path the QP knows the query failed before any bytes
 * are on the wire and `write-error!` sets 400/403/500/503 — that is what the
 * table above shows. But that branch is explicitly conditional on the response
 * being *uncommitted*:
 *
 *     (committed?) → abort-connection!          ; cannot change the status now
 *     :else        → (set-status! (or status-code 500))
 *
 * A query that starts streaming rows and then fails has already sent `202`. On
 * current versions the connection is aborted, which surfaces as a transport
 * error; on older ones the error blob was simply appended to a 200/202 body.
 * Either way, the status code is not the whole answer, and `status: "failed"`
 * in the body is authoritative. {@link MetabaseClient.runQuery} therefore checks
 * the body on **every** query, however healthy the status line looked.
 *
 * ## What this client does NOT do
 *
 * It never sets an auth header. `x-api-key` is stamped by `auth/api-key.ts`'s
 * `sign` hook, which is the only place the credential is visible. Actions call
 * `ctx.fetch` exclusively through here.
 */

/** Public (redacted-safe) Connection metadata published by `afterConnect`. */
export interface MetabaseConnectionDisplay {
  /** Origin of the Metabase instance, normalised, no trailing slash and no `/api`. */
  siteUrl?: string;
}

/**
 * Normalise a user-typed site URL into a bare origin.
 *
 * People paste all of `metabase.example.com`, `https://metabase.example.com/`,
 * `https://metabase.example.com/api` and `https://metabase.example.com/question/40`.
 * All of them mean the same instance.
 *
 * The `/api` strip is not cosmetic. Metabase's own docs example is
 * `curl -H 'X-API-Key: …' 'http://localhost:3000/api/permissions/group'`, so
 * `…/api` is exactly as plausible a paste as the bare origin — and silently
 * producing `/api/api/dataset` would be a baffling 404.
 *
 * A missing scheme defaults to `https`: an API key in flight deserves TLS, and
 * silently producing an `http://` base from a bare hostname would downgrade the
 * credential's transport. Operators who genuinely run plaintext on a private
 * network can still type `http://` explicitly.
 */
export function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Metabase site URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Metabase site URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Metabase site URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the instance origin off the redacted Connection. Never touches the credential. */
export function siteUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as MetabaseConnectionDisplay;
  if (display.siteUrl) return normalizeSiteUrl(display.siteUrl);
  throw new Error(
    "Metabase connection records no site URL — reconnect the instance so it can be stored.",
  );
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue | string[]>;
  body?: unknown;
}

/**
 * A Metabase query result, as declared by `metabase.query-processor.schema.query-result`
 * in the vendor's own OpenAPI document. `status` and `row_count` are the two
 * fields the schema marks required.
 */
export interface MetabaseQueryResult {
  status: "completed" | "failed" | string;
  row_count?: number;
  running_time?: number;
  database_id?: number;
  started_at?: string;
  context?: string;
  json_query?: Record<string, unknown>;
  average_execution_time?: number | null;
  cached?: string | null;
  /** Present when `status` is `failed`. */
  error?: string;
  /** Present when `status` is `failed` — e.g. `invalid-query`, `qp`, `db-file-not-found`. */
  error_type?: string;
  data?: {
    rows?: unknown[][];
    cols?: Array<Record<string, unknown>>;
    native_form?: Record<string, unknown>;
    results_metadata?: Record<string, unknown>;
    insights?: unknown[];
    results_timezone?: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

/** Metabase's `{ data, total, limit, offset }` envelope, used by search and collection items. */
export interface MetabasePage<T = Record<string, unknown>> {
  data: T[];
  total?: number;
  limit?: number | null;
  offset?: number | null;
  models?: string[];
}

/**
 * Drop keys the caller left unset.
 *
 * `undefined`, `null` and `""` all mean "not supplied". Metabase's update
 * endpoints (`PUT /api/card/{id}`, `PUT /api/dashboard/{id}`) apply exactly the
 * keys present in the body, so forwarding a key the user never touched would
 * overwrite a real value with a blank. `false` and `0` are NOT dropped —
 * `archived: false` is how a question is un-archived, and dropping it would make
 * that impossible to express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Normalise a `multiselect` param into a list of values.
 *
 * A multiselect normally arrives as an array, but the host may hand a single
 * selection through as a bare string, and a user typing into a plain text field
 * upstream may produce a comma-separated one. All three mean the same thing to
 * Metabase, whose multi-valued query params are repeated (`?models=card&models=dashboard`),
 * so all three are accepted here rather than at each call site.
 */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host may hand a `json` param through as either shape depending on whether
 * a person typed it into the editor or an upstream step produced it, so every
 * JSON-shaped param in this app goes through here rather than assuming one.
 */
export function asJson<T>(value: unknown, label: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required`);
  }
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same as {@link asJson}, but an absent value is simply absent rather than an error. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return asJson<T>(value, label);
}

export class MetabaseClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = siteUrlFromConnection(ctx.connection);
  }

  /** JSON in, JSON out. `204` and an empty body both resolve to `undefined`. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Same request, returned verbatim as text.
   *
   * The `/query/csv` and `/query/xlsx` export paths answer `text/csv` and a
   * binary spreadsheet, not JSON. Running them through `request` would throw on
   * `JSON.parse` — a confusing failure for a call that actually succeeded.
   */
  async requestText(path: string, options: RequestOptions = {}): Promise<string> {
    const res = await this.send(path, options);
    return await res.text();
  }

  /**
   * Run a query endpoint and refuse to call a failed query a success.
   *
   * This is the one method every query-running action goes through, and the
   * reason it exists is the class of bug described at the top of this file: the
   * HTTP status line is necessary but not sufficient. `send` has already
   * rejected any non-2xx (which is where a *pre-stream* query error lands, as a
   * 400/403/500/503). What is left is the 2xx whose body says otherwise, and
   * that is checked here.
   *
   * The vendor's `error` string is surfaced verbatim because it is the only
   * actionable half — "no such table: orders_2024" is the whole answer. It
   * carries no credential material: the credential never enters this module,
   * and the message is the database driver's own text.
   *
   * `stacktrace` and `via` are stripped before the result is returned. Metabase
   * attaches a full Clojure stack trace to a failed query (verified: ~30 frames
   * for a one-line SQL typo), which is noise in a workflow step's output and
   * would dwarf the actual error in any log that captures it.
   */
  async runQuery(path: string, options: RequestOptions = {}): Promise<MetabaseQueryResult> {
    const result = await this.request<MetabaseQueryResult>(path, {
      method: "POST",
      body: {},
      ...options,
    });
    return assertQuerySucceeded(result, path);
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Metabase repeats a multi-valued query param rather than comma-joining
      // it: `?models=card&models=dashboard`. Verified against
      // `GET /api/search` and `GET /api/collection/{id}/items`, whose OpenAPI
      // schemas type `models` as an array of enum strings.
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
        continue;
      }
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
      // Metabase's error bodies are inconsistent by design: an auth failure is
      // the plain-text string `Unauthenticated` (verified: 401, `text/plain`),
      // a validation failure is `{"errors":{"field":"message"}}`, and a failed
      // query is the whole query-result map. The body is where the actionable
      // half lives in all three, so it is surfaced verbatim — truncated,
      // because the query-result variant carries a stack trace.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Metabase ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${
          truncate(detail)
        }`,
      );
    }
    return res;
  }
}

/**
 * The body-level verdict, factored out of the client so it can be unit-tested
 * directly and reused by the health check that runs a query.
 *
 * A missing `status` is treated as success rather than failure: `status` is
 * required by the schema, but an endpoint that returned something else entirely
 * (a proxy's JSON error page, say) has already failed the HTTP check, and
 * inventing a failure from an absent field would misreport any future response
 * shape that drops it.
 */
export function assertQuerySucceeded(
  result: MetabaseQueryResult | undefined,
  path: string,
): MetabaseQueryResult {
  if (!result) throw new Error(`Metabase returned an empty body for ${path}`);
  if (result.status === "failed") {
    const type = result.error_type ? ` (${result.error_type})` : "";
    throw new Error(
      `Metabase query failed${type}: ${truncate(result.error ?? "no error message", 1000)}`,
    );
  }
  const { stacktrace: _stacktrace, via: _via, ...clean } = result;
  return clean as MetabaseQueryResult;
}

/** Keep an error message readable. Metabase's failure bodies run to tens of KB. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}
