import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Datto Autotask PSA REST API — read against the vendor's own Swagger document
 * (`/atservicesrest/swagger/docs/v1`, 3.1 MB, public) and its developer help on 2026-10-06, and
 * probed live for the auth and zone behaviour below.
 *
 * ## The host is the zone, and the zone is a fixed list
 *
 * An Autotask database lives on exactly one numbered zone, served from
 * `webservices{N}.autotask.net`, and a call to the wrong zone is refused. The vendor publishes the
 * zone list ("Autotask API zones and WSDL versions"): 1-6, 11, 12, 14-19, 22, 24-26, 28, 29. That is
 * a closed set the manifest can enumerate, so every zone host is in `network.allow` and the
 * connection says which one is the tenant's. The list has grown (22 to 29 are recent), so a new
 * zone needs a one-line manifest and `ZONES` edit; `tests/index.test.ts` pins the two together.
 *
 * `webservices.autotask.net` (no number) answers `zoneInformation` for any username and is how the
 * auth `test` hook catches a wrong zone before the first real call fails.
 *
 * ## Three headers, not one credential
 *
 * Every request carries `UserName`, `Secret` and `ApiIntegrationCode` (the API-only user's
 * tracking identifier). Only the auth `sign` hook sets them.
 *
 * ## Every auth failure is the same empty 401
 *
 * A missing credential, a wrong secret, a wrong username and a wrong integration code all answer
 * `401` with `content-length: 0` and only a `www-authenticate: Basic Realm="webservicesN..."`
 * header (measured live against zone 2). There is no body to classify, so the message names the
 * four candidates instead of guessing one.
 *
 * ## Writes answer `{ "itemId": n }`; failures are 500 with `{ "errors": [...] }`
 *
 * A validation failure on create or update is an HTTP 500 carrying a string array, not a 4xx. The
 * client reads the `errors` array whatever the status.
 */

/** Zones published at "Autotask API zones and WSDL versions". */
export const ZONES = [
  1,
  2,
  3,
  4,
  5,
  6,
  11,
  12,
  14,
  15,
  16,
  17,
  18,
  19,
  22,
  24,
  25,
  26,
  28,
  29,
] as const;

/** Host that answers `zoneInformation` for any user. */
export const DISCOVERY_HOST = "webservices.autotask.net";

export const API_PATH = "/atservicesrest/V1.0";

/** The hostname of a zone. */
export function zoneHost(zone: string): string {
  return `webservices${zone}.autotask.net`;
}

/** The API base URL of a zone. */
export function zoneBase(zone: string): string {
  return `https://${zoneHost(zone)}${API_PATH}`;
}

/**
 * Normalise a caller's spelling of a zone (`2`, `"Zone 2"`, `webservices2`,
 * `webservices2.autotask.net`) to the bare number, or undefined when it is not a published zone.
 */
export function zoneOf(value: unknown): string | undefined {
  const match = String(value ?? "").match(/(\d+)(?!.*\d)/);
  if (!match) return undefined;
  const n = Number(match[1]);
  return (ZONES as readonly number[]).includes(n) ? String(n) : undefined;
}

/** Read the zone off the redacted Connection. */
export function zoneFromConnection(connection: RedactedConnection | undefined): string | undefined {
  const display = (connection?.display ?? {}) as { zone?: unknown };
  return zoneOf(display.zone);
}

/** Keys that are secrets in Autotask's own models (webhook `secretKey`, portal `password`, ...). */
const SECRET_KEYS = new Set(["secretkey", "secret", "password"]);

/** Deep copy of a response with every secret-bearing key removed. */
export function redact<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => redact(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEYS.has(k.toLowerCase())) continue;
      out[k] = redact(v);
    }
    return out as T;
  }
  return value;
}

/** Drop keys the caller left unset. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
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

/** Parse a JSON object param, refusing arrays and scalars. */
export function jsonObject(value: unknown, field: string): Record<string, unknown> | undefined {
  const parsed = json(value, field);
  if (parsed === undefined) return undefined;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${field}\` must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/** Split a comma-separated field list. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** A filter that matches every row; the API refuses a query with no filter at all. */
export const MATCH_ALL = [{ op: "gte", field: "id", value: 0 }];

/** The vendor's query body. */
export interface QueryBody {
  filter: unknown[];
  maxRecords?: number;
  includeFields?: string[];
}

/** Accept `[{...}]` or a pasted `{"filter":[...]}`, and fall back to match-all. */
export function filterOf(value: unknown): unknown[] {
  const parsed = json(value, "filter");
  if (parsed === undefined) return MATCH_ALL;
  if (Array.isArray(parsed)) return parsed.length ? parsed : MATCH_ALL;
  if (parsed && typeof parsed === "object") {
    const inner = (parsed as { filter?: unknown }).filter;
    if (Array.isArray(inner)) return inner.length ? inner : MATCH_ALL;
    if ("op" in parsed) return [parsed];
  }
  throw new Error(
    "`filter` must be an array of filter objects, e.g. " +
      '[{"op":"eq","field":"status","value":1}]',
  );
}

/** Pull a readable message out of whatever the API answered. */
export function describeError(status: number, text: string): string {
  let detail = "";
  try {
    const body = JSON.parse(text) as { errors?: unknown; message?: unknown };
    if (Array.isArray(body?.errors) && body.errors.length) {
      detail = body.errors.map((e) => String(e)).join("; ");
    } else if (typeof body?.message === "string") {
      detail = body.message;
    }
  } catch { /* an empty or non-JSON body */ }
  if (status === 401) {
    return "401 with no body. Autotask answers a missing credential, a wrong secret, a wrong " +
      "username and a wrong integration code identically. Check all three values, that the user " +
      "is an API User (API-only) security level, and that the connection's zone is the one in " +
      "your Autotask web address";
  }
  if (status === 403) {
    return `${detail || "forbidden"} (the API user's security level may not allow this entity)`;
  }
  if (status === 429) {
    return `${detail || "rate limited"} (Autotask caps a database at 10,000 API requests per ` +
      "hour across all integrations and adds latency as it approaches that)";
  }
  return detail || text.slice(0, 300) || `HTTP ${status}`;
}

export interface PageDetails {
  count?: number;
  requestCount?: number;
  prevPageUrl?: string | null;
  nextPageUrl?: string | null;
}

export interface QueryResult<T = Record<string, unknown>> {
  items: T[];
  pageDetails: PageDetails;
}

/** Page URLs come back absolute; refuse any that are not a published zone over HTTPS. */
export function checkPageUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("`pageUrl` is not a valid URL");
  }
  const zone = zoneOf(parsed.hostname.replace(/\.autotask\.net$/, ""));
  if (
    parsed.protocol !== "https:" || !/^webservices\d+\.autotask\.net$/.test(parsed.hostname) ||
    !zone || !parsed.pathname.toLowerCase().startsWith("/atservicesrest/")
  ) {
    throw new Error("`pageUrl` must be a nextPageUrl returned by an earlier Autotask query");
  }
  return parsed;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets a credential: the runtime routes every request
 * through the auth `sign` hook.
 */
export class AutotaskClient {
  readonly zone: string;

  constructor(private ctx: HookContext) {
    const zone = zoneFromConnection(ctx.connection);
    if (!zone) {
      throw new Error(
        "this connection has no valid Autotask zone — reconnect and pick the zone number from " +
          "your Autotask web address (webservices{N}.autotask.net)",
      );
    }
    this.zone = zone;
  }

  get base(): string {
    return zoneBase(this.zone);
  }

  /** One call; returns the parsed JSON body (or undefined for an empty one). */
  async call<T = unknown>(
    method: string,
    path: string,
    options: { query?: Record<string, string | number | undefined>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    return await this.send<T>(method, url, options.body);
  }

  private async send<T>(method: string, url: URL, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Autotask ${res.status} for ${method} ${url.pathname}: ${describeError(res.status, text)}`,
      );
    }
    if (!text) return undefined as T;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Autotask did not return JSON for ${url.pathname}: ${text.slice(0, 160)}`);
    }
    // A 200 can still carry `{ "errors": [...] }` on some operational calls.
    const errors = (parsed as { errors?: unknown } | null)?.errors;
    if (Array.isArray(errors) && errors.length) {
      throw new Error(`Autotask refused ${method} ${url.pathname}: ${errors.join("; ")}`);
    }
    return redact(parsed) as T;
  }

  /** `POST /{Entity}/query`. */
  async query<T = Record<string, unknown>>(
    entity: string,
    body: QueryBody,
  ): Promise<QueryResult<T>> {
    const res = await this.call<Partial<QueryResult<T>>>("POST", `/${entity}/query`, { body });
    return { items: res?.items ?? [], pageDetails: res?.pageDetails ?? {} };
  }

  /** Follow a `nextPageUrl` from an earlier query. */
  async page<T = Record<string, unknown>>(pageUrl: string): Promise<QueryResult<T>> {
    const url = checkPageUrl(pageUrl);
    if (url.hostname !== zoneHost(this.zone)) {
      throw new Error("`pageUrl` belongs to a different zone than this connection");
    }
    const res = await this.send<Partial<QueryResult<T>>>("GET", url);
    return { items: res?.items ?? [], pageDetails: res?.pageDetails ?? {} };
  }

  /** A write; Autotask answers `{ "itemId": n }`. */
  async write(
    method: "POST" | "PATCH",
    path: string,
    body: Record<string, unknown>,
  ): Promise<{ itemId?: number }> {
    const res = await this.call<{ itemId?: number } | undefined>(method, path, { body });
    return { itemId: res?.itemId };
  }
}
