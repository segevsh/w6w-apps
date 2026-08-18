import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Amplitude — verified live against all four hosts on 2026-08-18, with field
 * semantics from Amplitude's own HTTP V2 documentation.
 *
 * ## This is two products with two credentials and four hosts
 *
 * Amplitude's API is not one surface. It is an **ingest** side and a **query**
 * side, and almost nothing is shared between them:
 *
 * | | Ingest | Query |
 * | --- | --- | --- |
 * | US host | `api2.amplitude.com` | `amplitude.com` |
 * | EU host | `api.eu.amplitude.com` | `analytics.eu.amplitude.com` |
 * | Credential | the **API key**, in the request body | API key **and secret key**, HTTP Basic |
 * | Bad credential | `400 {"code":400,"error":"Invalid API key: …"}` | `403 {"error":{"metadata":{"details":"Invalid API Key"}}}` |
 *
 * All four measured. The API key alone is deliberately semi-public — it ships
 * inside mobile and browser clients — so it can only *write*. The secret key
 * is what reads, and using the API key alone against the query side returns
 * `Invalid API Key` even though the key is perfectly valid, which sends people
 * to regenerate a credential that was never the problem.
 *
 * There is a third shape: the `/identify` endpoint is **form-encoded** and
 * answers a bad key with the plain text `invalid_api_key`, no JSON at all.
 *
 * The auth `sign` hook handles all three injection sites, chosen by host and
 * content type, so no action ever touches a credential.
 *
 * ## Short ids are silently removed, not rejected
 *
 * From Amplitude's documentation: user and device ids below **5 characters**
 * are *"removed from events"*. Not an error — the event is accepted, ingested,
 * and anonymous. A workflow sending numeric ids from another system (`42`,
 * `1071`) produces a stream of events attached to nobody, and the 200 response
 * says `events_ingested: 1`.
 *
 * `min_id_length` in `options` overrides the threshold, and this app surfaces
 * it rather than letting the data quietly detach.
 *
 * ## Partial failure is normal, and it is reported by index
 *
 * A 400 or 429 does not mean the batch failed. It means *some events* did, and
 * the body names which by position: `events_with_invalid_fields`,
 * `events_with_missing_fields`, `silenced_events`, `throttled_events`. Retrying
 * the whole batch therefore double-sends everything that already succeeded —
 * unless `insert_id` is set, which is the only deduplication Amplitude has
 * (same `device_id` + `insert_id` within 7 days).
 *
 * `event-track` derives a stable `insert_id` from each event's own content, so
 * a retry of the same payload deduplicates instead of double-counting.
 */

/** Ingest and query hosts, per region. */
export const HOSTS = {
  US: { ingest: "https://api2.amplitude.com", query: "https://amplitude.com" },
  EU: { ingest: "https://api.eu.amplitude.com", query: "https://analytics.eu.amplitude.com" },
} as const;

export type Region = keyof typeof HOSTS;

/** Amplitude's default minimum id length. Shorter ids are dropped, not refused. */
export const MIN_ID_LENGTH = 5;

/** Public (redacted-safe) connection metadata. */
export interface AmplitudeConnectionDisplay {
  region?: string;
  projectName?: string;
}

/** Normalise a region field. */
export function regionOf(value: unknown): Region {
  return String(value ?? "US").trim().toUpperCase() === "EU" ? "EU" : "US";
}

/** Read the region off the redacted Connection. */
export function regionFromConnection(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as AmplitudeConnectionDisplay;
  return regionOf(display.region);
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

/** Coerce loosely-typed action params into query-string values, dropping empties. */
export function query(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "number" || typeof v === "boolean" ? v : String(v);
  }
  return out;
}

/** Drop keys the caller left unset. */
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

/** The ingest side's response, success or partial failure. */
export interface IngestResponse {
  code?: number;
  error?: string;
  events_ingested?: number;
  payload_size_bytes?: number;
  server_upload_time?: number;
  missing_field?: string;
  events_with_invalid_fields?: Record<string, number[]>;
  events_with_missing_fields?: Record<string, number[]>;
  silenced_events?: number[];
  silenced_devices?: string[];
  throttled_events?: number[];
  throttled_devices?: Record<string, number>;
  throttled_users?: Record<string, number>;
  eps_threshold?: number;
}

/**
 * Collect the event indexes a partial failure names.
 *
 * The four fields report the same thing four ways, and a caller retrying needs
 * the union — everything *not* in it was accepted, and resending it without an
 * `insert_id` double-counts.
 */
export function rejectedIndexes(body: IngestResponse | null | undefined): number[] {
  const indexes = new Set<number>();
  for (const list of Object.values(body?.events_with_invalid_fields ?? {})) {
    for (const index of list) indexes.add(index);
  }
  for (const list of Object.values(body?.events_with_missing_fields ?? {})) {
    for (const index of list) indexes.add(index);
  }
  for (const index of body?.silenced_events ?? []) indexes.add(index);
  for (const index of body?.throttled_events ?? []) indexes.add(index);
  return [...indexes].sort((a, b) => a - b);
}

/** Turn an ingest failure into something actionable. */
export function describeIngest(status: number, body: IngestResponse | null, text: string): string {
  const base = body?.error ?? text.slice(0, 200) ?? `HTTP ${status}`;

  if (/invalid api key/i.test(base)) {
    return `${base} — this is the INGEST side, which takes the project API key alone. If the ` +
      "key is right, check the region: an EU project's key is rejected by the US host with " +
      "exactly this message";
  }
  if (status === 429) {
    const threshold = body?.eps_threshold;
    return `throttled${threshold ? ` at ${threshold} events per second` : ""} — Amplitude limits ` +
      "per user and per device, not per project, so one runaway id throttles only itself. The " +
      "throttled events are named by index and everything else was accepted; wait 30 seconds " +
      "and resend ONLY those";
  }
  if (body?.missing_field) {
    return `${base} — missing \`${body.missing_field}\``;
  }
  return base;
}

/** The query side's error envelope. */
export interface DashboardError {
  error?: {
    http_code?: number;
    type?: string;
    message?: string;
    metadata?: { details?: string };
  };
}

/** Turn a query-side failure into something actionable. */
export function describeDashboard(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as DashboardError;
    detail = body?.error?.metadata?.details ?? body?.error?.message ?? detail;
  } catch { /* several endpoints answer with plain text */ }

  if (status === 403 || /invalid api key/i.test(detail)) {
    return `${detail} — the QUERY side needs the API key AND the secret key, sent as HTTP Basic. ` +
      "The API key alone is a write-only credential and is refused here with this exact message, " +
      "so the key is probably fine and the secret is missing or from another project";
  }
  if (status === 429) {
    return `${detail} — the query side is cost-limited rather than request-limited: an expensive ` +
      "segmentation over a wide window consumes more of the allowance than a narrow one";
  }
  return detail || `HTTP ${status}`;
}

export interface IngestOptions {
  /** `/2/httpapi`, `/batch`, `/identify`, `/groupidentify`. */
  path: string;
  body: Record<string, unknown>;
  /** `/identify` and `/groupidentify` are form-encoded, unlike everything else. */
  form?: boolean;
}

export interface DashboardOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** The export endpoint answers with a ZIP rather than JSON. */
  binary?: boolean;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets a credential — the runtime
 * routes every request through the auth `sign` hook, which knows which of the
 * three injection sites each host needs.
 */
export class AmplitudeClient {
  readonly region: Region;

  constructor(private ctx: HookContext) {
    this.region = regionFromConnection(ctx.connection);
  }

  get ingestHost(): string {
    return HOSTS[this.region].ingest;
  }

  get queryHost(): string {
    return HOSTS[this.region].query;
  }

  /**
   * The ingest side. Returns the body on success *and* on a partial failure,
   * because a 400 here usually means some events were accepted.
   */
  async ingest(
    options: IngestOptions,
  ): Promise<{ body: IngestResponse; status: number; partial: boolean }> {
    const headers: Record<string, string> = {
      accept: "application/json",
      "content-type": options.form ? "application/x-www-form-urlencoded" : "application/json",
    };
    const body = options.form
      ? new URLSearchParams(
        Object.entries(options.body).map(([k, v]) => [k, String(v)]),
      ).toString()
      : JSON.stringify(options.body);

    const res = await this.ctx.fetch(`${this.ingestHost}${options.path}`, {
      method: "POST",
      headers,
      body,
    });
    const text = await res.text().catch(() => "");

    let parsed: IngestResponse | null = null;
    try {
      parsed = JSON.parse(text) as IngestResponse;
    } catch {
      // `/identify` answers `invalid_api_key` as plain text.
      parsed = null;
    }

    // A partial failure names the events it rejected; everything else landed.
    const rejected = rejectedIndexes(parsed);
    if (!res.ok && rejected.length === 0) {
      throw new Error(
        `Amplitude ingest ${res.status}: ${describeIngest(res.status, parsed, text)}`,
      );
    }
    return {
      body: parsed ?? { code: res.status },
      status: res.status,
      partial: !res.ok && rejected.length > 0,
    };
  }

  /** The query side. */
  async dashboard<T = unknown>(path: string, options: DashboardOptions = {}): Promise<T> {
    const url = new URL(`${this.queryHost}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: options.binary ? "application/zip" : "application/json",
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (options.binary) {
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Amplitude ${res.status} for ${url.pathname}: ${describeDashboard(res.status, text)}`,
        );
      }
      return res as unknown as T;
    }

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Amplitude ${res.status} for ${url.pathname}: ${describeDashboard(res.status, text)}`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Amplitude did not return JSON: ${text.slice(0, 160)}`);
    }
  }
}

/**
 * A stable `insert_id` derived from the event itself.
 *
 * Deduplication is the only protection against a retry double-counting, and it
 * keys on the value being *the same across attempts*. A freshly generated UUID
 * therefore achieves nothing — the retry carries a different one and both
 * events land.
 *
 * Hashing the event's own content gives an id that is identical whenever the
 * payload is identical and different whenever it is not, which is exactly the
 * property a retry needs. A caller who wants two genuinely identical events to
 * both count can supply their own.
 */
export async function deriveInsertId(event: Record<string, unknown>): Promise<string> {
  // Sorted keys, so property order in the caller's JSON does not change the id.
  const canonical = JSON.stringify(event, Object.keys(event).sort());
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Which ids in a batch are short enough that Amplitude will silently drop them.
 *
 * Returned rather than thrown, because the right response depends on the
 * caller: raising `min_id_length` is correct when the ids really are short, and
 * fixing the ids is correct when they are wrong.
 */
export function shortIds(
  events: Array<Record<string, unknown>>,
  minLength = MIN_ID_LENGTH,
): Array<{ index: number; field: string; value: string }> {
  const found: Array<{ index: number; field: string; value: string }> = [];
  events.forEach((event, index) => {
    for (const field of ["user_id", "device_id"]) {
      const value = event[field];
      if (value === undefined || value === null) continue;
      const text = String(value);
      if (text.length > 0 && text.length < minLength) found.push({ index, field, value: text });
    }
  });
  return found;
}
