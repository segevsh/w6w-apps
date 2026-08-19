import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * The Looker API 4.0 — built against Looker's own OpenAPI document
 * (`looker-open-source/sdk-codegen`, `spec/Looker.4.0.oas.json`, 339 paths,
 * version 4.0.26.12, fetched 2026-08-19).
 *
 * ## Every query here runs against the customer's warehouse, now
 *
 * Looker is a semantic layer, not a data store. Running a Look or an inline
 * query compiles LookML to SQL and executes it against BigQuery, Snowflake,
 * Redshift or whatever sits underneath — so the cost, the latency and the
 * concurrency limits are the **warehouse's**, and they are somebody else's
 * budget.
 *
 * That is the thing to hold onto: an action here that looks like "read a
 * report" is a database query, and a careless one is a large database query.
 * `limit` is the control, and Looker's own documentation is explicit that
 * **`-1` means unlimited** — which on a wide Explore is a way to melt a
 * warehouse from a workflow.
 *
 * ## The instance is the host, and self-hosted Looker uses a different port
 *
 * Looker-hosted instances answer on `https://{name}.cloud.looker.com` — the API
 * on the ordinary port. A **self-hosted** Looker serves its web interface on
 * one port and its **API on 19999**, so the URL that works in a browser does
 * not work here, and the failure is a connection refused rather than anything
 * about APIs.
 *
 * ## `view` means Explore
 *
 * In the API a query has a `model` and a `view`. Looker's own spec documents
 * `Query.view` as **"Explore Name"** — the thing the interface calls an
 * Explore, and *not* the LookML `view` that Explores are built from. Somebody
 * reading the LookML and filling in the view name gets a 404 for an Explore
 * that does not exist.
 *
 * ## Field names are `view_name.field_name`, always
 *
 * `orders.count`, `users.created_date`. A bare field name is not valid and
 * produces an error naming the field rather than the form, so it reads like the
 * field is missing.
 */

/** Looker-hosted instances. Self-hosted use their own host and port 19999. */
export const HOSTED_SUFFIX = ".cloud.looker.com";

/** The port a self-hosted Looker serves its API on. */
export const SELF_HOSTED_API_PORT = 19999;

/** Public (redacted-safe) connection metadata. */
export interface LookerConnectionDisplay {
  /** The instance origin, including the port where it matters. */
  host?: string;
  /** Who the credentials belong to. */
  userName?: string;
  userId?: string;
}

/**
 * Normalise an instance URL into an origin.
 *
 * A Looker-hosted instance is reached on the ordinary port; a self-hosted one
 * serves the API on 19999 while its web interface is elsewhere. So a bare
 * hostname that is not `*.cloud.looker.com` gets 19999 appended, because that
 * is what an API URL for self-hosted Looker looks like and pasting the browser
 * URL is the mistake this prevents.
 */
export function normalizeHost(raw: unknown): string {
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("a Looker instance URL is required");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`the Looker host is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`the Looker host has no hostname: ${trimmed}`);

  if (url.port) return `${url.protocol}//${url.host}`;
  // Looker-hosted answers on the ordinary port; self-hosted does not.
  if (url.hostname.endsWith(HOSTED_SUFFIX)) return `${url.protocol}//${url.hostname}`;
  return `${url.protocol}//${url.hostname}:${SELF_HOSTED_API_PORT}`;
}

/** The instance for this connection. */
export function hostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as LookerConnectionDisplay;
  const host = String(display.host ?? "").trim();
  if (!host) {
    throw new Error(
      "this connection has no Looker instance recorded — reconnect it, because every Looker " +
        "deployment is its own host and nothing can be addressed without one",
    );
  }
  return normalizeHost(host);
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Return the body as text — query results come back as CSV, JSON or an image. */
  text?: boolean;
}

/** Drop keys the caller left unset, so a default is not overwritten with nothing. */
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

/** Coerce a params bag into query values, dropping what was left unset. */
export function query(input: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "boolean" || typeof v === "number" ? v : String(v);
  }
  return out;
}

/**
 * Check a field reference is qualified.
 *
 * Looker fields are always `view_name.field_name`. A bare name produces an
 * error naming the field, which reads as though the field is missing rather
 * than as though the reference is malformed.
 */
export function assertQualifiedFields(fields: string[], param: string): void {
  const bare = fields.filter((field) => !field.includes("."));
  if (bare.length) {
    throw new Error(
      `\`${param}\` must use fully-qualified Looker field names — \`view_name.field_name\`, e.g. ` +
        `\`orders.count\`. These are not: ${bare.join(", ")}. Looker's error for a bare name ` +
        "names the field, which reads as though it does not exist",
    );
  }
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the token — the runtime routes
 * every request through the auth `sign` hook.
 */
export class LookerClient {
  readonly host: string;

  constructor(private ctx: HookContext, host?: string) {
    this.host = host ?? hostFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.host}/api/4.0${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: options.text ? "*/*" : "application/json",
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Looker ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    if (options.text) return text as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Looker did not return JSON: ${text.slice(0, 160)}`);
    }
  }
}

/**
 * Turn a Looker error into something actionable.
 *
 * The shape is `{"message": "…", "documentation_url": "…"}`, and validation
 * failures add an `errors` array whose entries carry `field` and `message` —
 * which is where the useful detail lives for a rejected query.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  const fieldErrors: string[] = [];
  try {
    const body = JSON.parse(text) as {
      message?: string;
      errors?: Array<{ field?: string; message?: string }>;
    };
    detail = body?.message || detail;
    for (const error of body?.errors ?? []) {
      fieldErrors.push([error?.field, error?.message].filter(Boolean).join(": "));
    }
  } catch { /* not JSON */ }
  const tail = fieldErrors.length ? ` — ${fieldErrors.join("; ")}` : "";

  if (status === 401) {
    return `${detail}${tail} — the token was not accepted. A Looker access token lasts one hour, ` +
      "so this is as likely to be an expired one as a wrong API key";
  }
  if (status === 403) {
    return `${detail}${tail} — authenticated and not permitted. Looker's permissions are per ` +
      "role and per model set, so an account can hold `see_looks` and still be refused a " +
      "specific model's data";
  }
  if (status === 404) {
    return `${detail}${tail} — not found. In a query, \`view\` is the EXPLORE name rather than a ` +
      "LookML view, so a view name taken from the LookML is a 404 for an Explore that does not " +
      "exist";
  }
  if (status === 422) {
    return `${detail}${tail} — the query was rejected. Field names must be qualified as ` +
      "`view_name.field_name`, and a bare name produces an error that reads as a missing field";
  }
  if (status === 429) {
    return `${detail}${tail} — rate limited by Looker itself, which is separate from any limit ` +
      "the underlying warehouse imposes";
  }
  return `${detail}${tail}` || `${status}`;
}
