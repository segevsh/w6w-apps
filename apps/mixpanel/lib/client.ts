import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Mixpanel's **Query**, **Ingestion** and **Raw Export** APIs.
 *
 * Mixpanel publishes no single OpenAPI document, so paths and parameters come
 * from its reference documentation (<https://docs.mixpanel.com/reference>) and
 * the behaviour below was **measured against the live hosts on 2026-08-18**.
 *
 * ## Three host families, each with three regions
 *
 * This is the first thing to get right, and the reason the region lives on the
 * credential:
 *
 * | Purpose | US | EU | India |
 * |---|---|---|---|
 * | Query (`/api/query/*`, `/api/app/*`) | `mixpanel.com` | `eu.mixpanel.com` | `in.mixpanel.com` |
 * | Ingestion (`/import`, `/engage`) | `api.mixpanel.com` | `api-eu.mixpanel.com` | `api-in.mixpanel.com` |
 * | Raw export (`/api/2.0/export`) | `data.mixpanel.com` | `data-eu.mixpanel.com` | `data-in.mixpanel.com` |
 *
 * A project lives in exactly one residency region, and calling another one's
 * host does not redirect — it fails to find the project. All nine hosts were
 * verified to answer 2026-08-18.
 *
 * ## The Query API's real constraint is 60 calls an hour
 *
 * Not per user, not per key: **60 queries per hour and 5 concurrent** for the
 * whole project, with a bare `429` when it is exceeded and no rate-limit
 * headers of any kind. That is the number to design around — a workflow that
 * queries per row of a list will exhaust it before lunch, and the recovery is
 * to wait. The raw Export API has its own budget (60/hour, 3/second, 100
 * concurrent), and ingestion is metered by volume rather than by call.
 */

/** Query and app-API hosts, by residency region. */
const QUERY_HOSTS: Record<string, string> = {
  us: "https://mixpanel.com",
  eu: "https://eu.mixpanel.com",
  in: "https://in.mixpanel.com",
};

/** Ingestion hosts — a different family from the query hosts. */
const INGEST_HOSTS: Record<string, string> = {
  us: "https://api.mixpanel.com",
  eu: "https://api-eu.mixpanel.com",
  in: "https://api-in.mixpanel.com",
};

/** Raw-export hosts — a third family again. */
const EXPORT_HOSTS: Record<string, string> = {
  us: "https://data.mixpanel.com",
  eu: "https://data-eu.mixpanel.com",
  in: "https://data-in.mixpanel.com",
};

export type Plane = "query" | "ingest" | "export";

/** Public (redacted-safe) connection metadata. */
export interface MixpanelConnectionDisplay {
  projectId?: string | number;
  region?: string;
  /** Whether the credential carries a project token, which profile writes need. */
  hasProjectToken?: boolean;
  serviceAccount?: string;
}

export function displayOf(connection: RedactedConnection | undefined): MixpanelConnectionDisplay {
  return (connection?.display ?? {}) as MixpanelConnectionDisplay;
}

export function normalizeRegion(region: unknown): string {
  const key = String(region ?? "").trim().toLowerCase();
  return key in QUERY_HOSTS ? key : "us";
}

/** The host for one plane in one region. */
export function hostFor(plane: Plane, region: unknown): string {
  const key = normalizeRegion(region);
  const table = plane === "ingest" ? INGEST_HOSTS : plane === "export" ? EXPORT_HOSTS : QUERY_HOSTS;
  return table[key];
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON body. */
  body?: unknown;
  /** Sends the body as form-encoded, which the cohorts endpoint wants. */
  form?: boolean;
  /** Which host family to call. Defaults to the query plane. */
  plane?: Plane;
  /** Skip appending `project_id`, for the few routes that carry it in the path. */
  noProjectId?: boolean;
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

/**
 * A `yyyy-mm-dd` date, which every query endpoint requires and none will infer.
 *
 * An ISO timestamp is truncated rather than rejected, because a date param in a
 * workflow usually arrives as one.
 */
export function queryDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) {
    throw new Error(`\`${field}\` must be a yyyy-mm-dd date; got ${raw}`);
  }
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class MixpanelClient {
  readonly region: string;
  readonly projectId: string;

  constructor(private ctx: HookContext) {
    const display = displayOf(ctx.connection);
    this.region = normalizeRegion(display.region);
    this.projectId = String(display.projectId ?? "");
    if (!this.projectId) {
      throw new Error(
        "this connection has no project id — reconnect the Mixpanel account, since every " +
          "service-account call needs one",
      );
    }
  }

  host(plane: Plane = "query"): string {
    return hostFor(plane, this.region);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.host(options.plane)}${path}`);
    // Every service-account call needs the project id; the API cannot infer it
    // from the credential, because one service account can reach many projects.
    if (!options.noProjectId) url.searchParams.set("project_id", this.projectId);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      if (options.form) {
        headers["content-type"] = "application/x-www-form-urlencoded";
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(options.body as Record<string, unknown>)) {
          if (v === undefined || v === null || v === "") continue;
          params.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
        }
        init.body = params.toString();
      } else {
        headers["content-type"] = "application/json";
        init.body = JSON.stringify(options.body);
      }
    }

    const res = await this.ctx.fetch(url.toString(), init);
    return await this.parse<T>(res, init.method ?? "GET", url);
  }

  /** Read a response, turning Mixpanel's several error shapes into one message. */
  private async parse<T>(res: Response, method: string, url: URL): Promise<T> {
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      let detail = text.slice(0, 300);
      try {
        const body = JSON.parse(text) as {
          error?: string;
          failed_records?: Array<{ index?: number; field?: string; message?: string }>;
        };
        if (body?.error) detail = body.error;
        if (Array.isArray(body?.failed_records) && body.failed_records.length > 0) {
          const first = body.failed_records[0];
          detail += ` — first failure at index ${first.index}: ${first.field} ${first.message}`;
        }
      } catch { /* not JSON */ }
      if (res.status === 429) {
        // The Query API allows 60 an hour for the whole project, and sends no
        // headers to say how many are left.
        detail = `rate limited — Mixpanel allows 60 queries an hour per project (${detail})`;
      }
      throw new Error(`Mixpanel ${res.status} for ${method} ${url.pathname}: ${detail}`);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Read a **JSONL** response — the raw Export API answers one JSON object per
   * line rather than a JSON array, so `.json()` fails on the second line.
   */
  async requestJsonl(path: string, options: RequestOptions = {}): Promise<unknown[]> {
    const url = new URL(`${this.host(options.plane)}${path}`);
    if (!options.noProjectId) url.searchParams.set("project_id", this.projectId);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const res = await this.ctx.fetch(url.toString(), { headers: { accept: "text/plain" } });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      let detail = text.slice(0, 300);
      try {
        detail = (JSON.parse(text) as { error?: string })?.error ?? detail;
      } catch { /* not JSON */ }
      if (res.status === 429) {
        detail = `rate limited — the export API allows 60 queries an hour (${detail})`;
      }
      throw new Error(`Mixpanel ${res.status} for GET ${url.pathname}: ${detail}`);
    }

    const rows: unknown[] = [];
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        rows.push(JSON.parse(trimmed));
      } catch {
        throw new Error(`the export returned a line that is not JSON: ${trimmed.slice(0, 120)}`);
      }
    }
    return rows;
  }
}
