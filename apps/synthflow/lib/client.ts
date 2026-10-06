import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Synthflow REST client — voice AI agents over `api[.us|.eu].synthflow.ai/v2`.
 *
 * Verified 2026-10-05 against Synthflow's own OpenAPI 3.1 document
 * (`https://docs.synthflow.ai/openapi.json`, `info.version` `1.0.0`, 69 paths, no
 * deprecated operation) plus live probes of all three hosts.
 *
 * ## Three clusters, one path space
 *
 * The document declares three servers — `https://api.synthflow.ai/v2` (Global),
 * `https://api.us.synthflow.ai/v2` (United States) and `https://api.eu.synthflow.ai/v2`
 * (European Union). A workspace belongs to exactly one cluster and **cannot be moved**
 * (docs: "Data Region"), so the cluster is a property of the connection: the `region`
 * field on the auth method, echoed into the redacted connection by `afterConnect`.
 * `sign` additionally pins the request host to the credential's own region — the only
 * hook that always holds it — so a connection whose `display` was never populated still
 * reaches the right host.
 *
 * ## Envelope
 *
 * Almost every success body is `{ "status": "ok", "response": { ... } }`; {@link unwrap}
 * returns `response`. Two exceptions are handled by the same helper: `GET /numbers/{slug}`
 * answers the phone number object bare, and mutating calls such as `DELETE /contacts/{id}`
 * answer `{ "status" }` alone.
 *
 * ## Errors
 *
 * Every failure observed live is `{ "detail": { "status": "error", "description",
 * "timestamp", "request_id", "category" } }`. A framework-level validation failure may
 * instead carry `detail` as an array of `{ msg, loc }` items; {@link formatSynthflowError}
 * handles both and always keeps `request_id`, which is what Synthflow support asks for.
 */

export const HOSTS = {
  global: "api.synthflow.ai",
  us: "api.us.synthflow.ai",
  eu: "api.eu.synthflow.ai",
} as const;

export type Region = keyof typeof HOSTS;

/** Every host this app may call. Mirrors `w6w.network.allow` in `package.json`. */
export const ALL_HOSTS: readonly string[] = Object.values(HOSTS);

export const API_PREFIX = "/v2";

/** Normalise a region field; anything unrecognised is the Global cluster. */
export function regionOf(value: unknown): Region {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "us" || v === "eu" ? v : "global";
}

/** Read the region off the redacted connection (populated by `afterConnect`). */
export function regionFromConnection(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as { region?: string };
  return regionOf(display.region);
}

export function baseUrl(region: Region): string {
  return `https://${HOSTS[region]}${API_PREFIX}`;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface SynthflowErrorBody {
  detail?:
    | { status?: string; description?: string; request_id?: string; category?: string }
    | Array<{ msg?: string; loc?: unknown[] }>
    | string;
}

/** Drop keys the caller left unset, so an unset field is never sent as `"undefined"`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Keep an error message readable. */
export function truncate(text: string, max = 800): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Turn Synthflow's error body into one actionable line. */
export function formatSynthflowError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: SynthflowErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as SynthflowErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const detail = parsed?.detail;
  let message: string | undefined;
  let requestId: string | undefined;
  if (typeof detail === "string") {
    message = detail;
  } else if (Array.isArray(detail)) {
    message = detail.map((d) => d?.msg).filter(Boolean).join("; ");
  } else if (detail && typeof detail === "object") {
    message = detail.description;
    requestId = detail.request_id;
  }
  if (!message) return `Synthflow ${status} for ${method} ${path}: ${truncate(raw)}`;
  return truncate(
    `Synthflow ${status} for ${method} ${path}: ${message}${
      requestId ? ` (request_id ${requestId})` : ""
    }`,
    1000,
  );
}

/** Return the `response` member of an envelope; a body without one is returned as is. */
export function unwrap<T = Record<string, unknown>>(body: unknown): T {
  if (body && typeof body === "object" && "response" in (body as Record<string, unknown>)) {
    return (body as { response: T }).response;
  }
  return body as T;
}

/** A list member that is an array in the documented shape; tolerate null/absent. */
export function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

/**
 * Split a list response into `{ items, pagination }`. Synthflow's list envelopes name
 * the array differently per resource (`assistants`, `calls`, `items`, …) and carry the
 * paging block either as `pagination` or as sibling counters (`total`, `page_size`).
 */
export function listResult(
  response: Record<string, unknown> | undefined,
  listKey: string,
): { items: unknown[]; pagination: unknown } {
  const { [listKey]: items, pagination, ...rest } = response ?? {};
  return { items: asArray(items), pagination: pagination ?? rest };
}

/** Params that Synthflow documents as arrays of `{ key, value }` custom variables. */
export function toKeyValueList(value: unknown, label: string): unknown[] | undefined {
  const parsed = asOptionalJson<unknown>(value, label);
  if (parsed === undefined) return undefined;
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object") {
    return Object.entries(parsed as Record<string, unknown>).map(([key, v]) => ({
      key,
      value: String(v),
    }));
  }
  throw new Error(`${label} must be a JSON object or an array of {key, value}`);
}

export class SynthflowClient {
  private base: string;

  constructor(private ctx: HookContext, opts: { region?: Region } = {}) {
    this.base = baseUrl(opts.region ?? regionFromConnection(ctx.connection));
  }

  /** Send a request and return the parsed JSON body (`undefined` for an empty one). */
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
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatSynthflowError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** {@link request} then {@link unwrap}. */
  async data<T = Record<string, unknown>>(path: string, options: RequestOptions = {}): Promise<T> {
    return unwrap<T>(await this.request(path, options));
  }
}
