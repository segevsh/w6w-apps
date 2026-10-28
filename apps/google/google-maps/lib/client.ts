import type { HookContext } from "@w6w/types";

/**
 * Google Maps Platform is **two APIs wearing one credential**, and they
 * disagree about almost everything except the key.
 *
 * Verified live on 2026-08-18 against each host, and against Google's own
 * discovery documents where they are served
 * (`places.googleapis.com/$discovery/rest?version=v1`, 148,503 bytes;
 * `addressvalidation…` 57,342; `roads…` 31,463 — Routes' discovery is 403, so
 * its shapes come from the REST reference).
 *
 * ## Generation 1 — the "web services", on `maps.googleapis.com`
 *
 * Geocoding, Time Zone, Elevation. They answer **HTTP 200 for everything**,
 * including failure, and put the outcome in a `status` string:
 *
 * ```
 * GET /maps/api/geocode/json?address=…&key=bogus  →  200
 * { "results": [], "status": "REQUEST_DENIED",
 *   "error_message": "The provided API key is invalid. " }
 * ```
 *
 * A caller checking `res.ok` sees success. A caller reading `results[0]` gets
 * `undefined`. Nothing anywhere says the key was refused unless you look at a
 * field that is absent on a good response.
 *
 * Worse, the message field is **not spelled the same way twice**: Geocoding,
 * Elevation and Distance Matrix use `error_message`; the Time Zone API uses
 * `errorMessage`. Both were confirmed live. `describeLegacy` reads both.
 *
 * ## Generation 2 — the JSON APIs, on their own hosts
 *
 * Places, Routes, Address Validation, Roads, Geolocation. Real HTTP codes and
 * a `google.rpc.Status` body — with one trap of their own:
 *
 * ```
 * POST places.googleapis.com/v1/places:searchText   →  400
 * { "error": { "code": 400, "status": "INVALID_ARGUMENT",
 *              "message": "API key not valid. Please pass a valid API key.",
 *              "details": [{ "reason": "API_KEY_INVALID" }] } }
 * ```
 *
 * **A rejected key is a `400`, not a `401` or `403`.** Anything that decides
 * "retry on 5xx, fail on 401, report a bad request to the user" will report a
 * credential problem as the caller's fault.
 *
 * ## The key travels in the query string, because it has to
 *
 * The generation-2 hosts accept `X-Goog-Api-Key`. The generation-1 ones do
 * **not** — probed live, `maps.googleapis.com` answers a header-only request
 * with *"You must use an API key to authenticate each request"*. The only
 * form that works across the whole surface is `?key=`, so that is what the
 * auth hook signs with, and it is the reason the key ends up in request URLs.
 *
 * ## One key, many separately-enabled APIs
 *
 * Each API is switched on per Cloud project. A key that geocodes perfectly
 * returns `REQUEST_DENIED` for Places until the Places API is enabled, and the
 * message names the API. This is why the `apis` health check exists: no single
 * probe can speak for the others.
 */

/** Generation-1 web services. Status lives in the body; HTTP is always 200. */
export const LEGACY_BASE = "https://maps.googleapis.com/maps/api";

/** Generation-2 hosts, each its own product and its own Cloud API to enable. */
export const HOSTS = {
  places: "https://places.googleapis.com",
  routes: "https://routes.googleapis.com",
  addressValidation: "https://addressvalidation.googleapis.com",
  roads: "https://roads.googleapis.com",
  geolocation: "https://www.googleapis.com",
} as const;

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

export interface LegacyResponse {
  status?: string;
  /** Geocoding, Elevation, Distance Matrix. */
  error_message?: string;
  /** Time Zone — same field, different spelling. Confirmed live 2026-08-18. */
  errorMessage?: string;
}

/**
 * The generation-1 status vocabulary.
 *
 * `ZERO_RESULTS` is the one that matters: it is a **successful** answer meaning
 * the address does not exist or the query matched nothing. Treating it as an
 * error turns "we could not find that address" into a failed workflow run.
 */
export const LEGACY_OK = new Set(["OK", "ZERO_RESULTS"]);

/** Drop keys the caller left unset, so a default is not overwritten with nothing. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Coerce loosely-typed action params into query-string values.
 *
 * Params arrive as `unknown` off a `Record<string, unknown>`; this narrows them
 * without each action having to cast at every call site, and drops the empties
 * so a default is never overwritten with nothing.
 */
export function query(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "number" || typeof v === "boolean" ? v : String(v);
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

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Parse `"37.42,-122.08"` — the form every Maps URL and every copy-paste from
 * the Google Maps app uses — into the `{latitude, longitude}` object the
 * generation-2 APIs want.
 *
 * The order is **latitude first**, which is the opposite of GeoJSON and of most
 * mapping libraries. Getting it backwards does not error: it produces a point
 * in the wrong hemisphere, or in the ocean, and the request succeeds. So the
 * range check below is not pedantry — a latitude above 90 is nearly always a
 * longitude in the wrong slot, and the error says so.
 */
export function latLng(value: unknown, field: string): LatLng {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`\`${field}\` is required as "lat,lng"`);
  const parts = text.split(",").map((p) => p.trim());
  if (parts.length !== 2) {
    throw new Error(`\`${field}\` must be "lat,lng" — got ${JSON.stringify(text)}`);
  }
  const latitude = Number(parts[0]);
  const longitude = Number(parts[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`\`${field}\` must be two numbers, "lat,lng" — got ${JSON.stringify(text)}`);
  }
  if (Math.abs(latitude) > 90) {
    throw new Error(
      `\`${field}\` has a latitude of ${latitude}, which is out of range. Google takes ` +
        "LATITUDE FIRST — the opposite of GeoJSON — so this is usually a longitude in the wrong " +
        "slot, and swapped coordinates do not error, they point somewhere else",
    );
  }
  if (Math.abs(longitude) > 180) {
    throw new Error(`\`${field}\` has a longitude of ${longitude}, which is out of range`);
  }
  return { latitude, longitude };
}

/** A `lat,lng|lat,lng|…` path, as the legacy and Roads APIs take it. */
export function latLngPath(value: unknown, field: string): LatLng[] {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`\`${field}\` is required`);
  const points = text.split("|").map((p) => p.trim()).filter(Boolean);
  if (points.length === 0) throw new Error(`\`${field}\` is required`);
  return points.map((p, i) => latLng(p, `${field}[${i}]`));
}

/** Render a point back into Google's `lat,lng` string form. */
export function pointString(point: LatLng): string {
  return `${point.latitude},${point.longitude}`;
}

/**
 * Turn a generation-1 body into an actionable message.
 *
 * The `status` values that matter here are `REQUEST_DENIED` (key refused, or
 * the API not enabled on the project), `OVER_QUERY_LIMIT` (a rate limit
 * arriving as a 200), `INVALID_REQUEST` (a missing or malformed parameter) and
 * `UNKNOWN_ERROR` (Google's own, retryable).
 */
export function describeLegacy(body: LegacyResponse | null, api: string): string {
  const status = body?.status ?? "an unknown status";
  // Same field, two spellings, depending on which web service answered.
  const detail = body?.error_message ?? body?.errorMessage ?? "";
  const base = detail ? `${status}: ${detail}` : status;

  if (status === "REQUEST_DENIED") {
    return `${base} — either the API key was refused, or the ${api} is not enabled on the Cloud ` +
      "project behind it. Each Maps API is enabled separately, so a key that works elsewhere " +
      "proves nothing here. A key restricted to HTTP referrers also fails server-side: " +
      "server calls need an IP restriction or none";
  }
  if (status === "OVER_QUERY_LIMIT") {
    return `${base} — this is a RATE LIMIT arriving as an HTTP 200. Check the per-minute quota ` +
      "for this API in the Cloud console, and whether billing is still enabled on the project";
  }
  if (status === "INVALID_REQUEST") {
    return `${base} — a required parameter is missing or malformed`;
  }
  return base;
}

/** The `google.rpc.Status` envelope the generation-2 APIs return. */
export interface RpcError {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{ reason?: string; "@type"?: string }>;
  };
}

/**
 * Turn a generation-2 error body into an actionable message.
 *
 * The important translation is `400 INVALID_ARGUMENT` with
 * `reason: "API_KEY_INVALID"` — a credential failure dressed as a bad request.
 */
export function describeRpc(status: number, text: string): string {
  let body: RpcError | null = null;
  try {
    body = JSON.parse(text) as RpcError;
  } catch { /* not JSON */ }
  const message = body?.error?.message ?? text.slice(0, 300);
  const reason = body?.error?.details?.find((d) => d.reason)?.reason;

  if (reason === "API_KEY_INVALID" || /API key not valid/i.test(message)) {
    return `${message} — note this arrives as a ${status}, not a 401 or 403, so it is a ` +
      "CREDENTIAL failure wearing a bad-request status code";
  }
  if (reason === "SERVICE_DISABLED" || /has not been used in project|is disabled/i.test(message)) {
    return `${message} — this API is not enabled on the Cloud project. Each Maps API is enabled ` +
      "separately, so a key that works for another one proves nothing here";
  }
  if (status === 403 && /referer|referrer/i.test(message)) {
    return `${message} — a key restricted to HTTP referrers cannot be used server-side. Use an ` +
      "IP restriction, or none";
  }
  if (status === 429) {
    return `${message} — rate limited. The per-minute quota is set per API in the Cloud console`;
  }
  return message || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /**
   * Places and Routes REQUIRE a response field mask, and it decides the price.
   * See `lib/fields.ts`.
   */
  fieldMask?: string;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the key — the runtime routes
 * every request through the auth `sign` hook, which appends `?key=`.
 */
export class MapsClient {
  constructor(private ctx: HookContext) {}

  /**
   * A generation-1 web service. Returns the parsed body when `status` is `OK`
   * or `ZERO_RESULTS`, and throws with a real explanation otherwise — because
   * the HTTP layer will say `200` either way.
   */
  async legacy<T extends LegacyResponse>(
    path: string,
    query: Record<string, QueryValue>,
    api: string,
  ): Promise<T> {
    const url = new URL(`${LEGACY_BASE}${path}`);
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const res = await this.ctx.fetch(url.toString(), {
      headers: { accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      // Rare on this generation, and worth distinguishing from a body status.
      throw new Error(`Google ${api} returned HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    let body: T | null = null;
    try {
      body = JSON.parse(text) as T;
    } catch {
      throw new Error(`Google ${api} did not return JSON: ${text.slice(0, 200)}`);
    }
    if (!LEGACY_OK.has(String(body?.status ?? ""))) {
      throw new Error(`Google ${api}: ${describeLegacy(body, api)}`);
    }
    return body as T;
  }

  /** A generation-2 JSON API. Real HTTP codes; a bad key is a 400. */
  async rpc<T>(host: string, path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${host}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    if (options.fieldMask) headers["x-goog-fieldmask"] = options.fieldMask;
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Google ${new URL(host).hostname} ${res.status}: ${describeRpc(res.status, text)}`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
