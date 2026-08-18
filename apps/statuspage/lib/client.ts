import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Atlassian **Statuspage**'s REST API v1.
 *
 * Paths, the authorization scheme and the rate limit come from Statuspage's own
 * reference (`developer.statuspage.io`, read 2026-08-18); the host and its
 * error shape were verified live the same day —
 * `{"error":"Could not authenticate"}` on any unauthenticated call.
 *
 * ## This app writes what the rest of this pack reads
 *
 * Nearly every health check in this catalogue consumes a Statuspage document:
 * `components.json`, `summary.json`, `status.json`. This app is the other side
 * of that — it is how a workflow *publishes* the status its own customers read,
 * and its vocabularies are exactly the ones those checks map from:
 *
 *   - component status — `operational`, `degraded_performance`,
 *     `partial_outage`, `major_outage`, `under_maintenance`;
 *   - incident status — `investigating`, `identified`, `monitoring`,
 *     `resolved`;
 *   - incident impact — `none`, `minor`, `major`, `critical`.
 *
 * ## One request per second, and two status codes for exceeding it
 *
 * Statuspage: *"Each API token is limited to 1 request / second as measured on
 * a 60 second rolling window."* That is a very low ceiling for a workflow —
 * updating six components is six seconds — and it is the reason
 * `incident-create` accepts component statuses in the same call rather than
 * inviting a loop.
 *
 * Exceeding it answers **`420` or `429`**. The 420 is unusual enough that a
 * generic client treats it as an unknown failure, so this one names both.
 */
export const BASE_URL = "https://api.statuspage.io/v1";

/** Component statuses, in the order a status page shows them. */
export const COMPONENT_STATUSES = [
  { value: "operational", label: "Operational" },
  { value: "degraded_performance", label: "Degraded performance" },
  { value: "partial_outage", label: "Partial outage" },
  { value: "major_outage", label: "Major outage" },
  { value: "under_maintenance", label: "Under maintenance" },
];

/** Incident lifecycle for a realtime (unplanned) incident. */
export const INCIDENT_STATUSES = [
  { value: "investigating", label: "Investigating — something is wrong" },
  { value: "identified", label: "Identified — the cause is known" },
  { value: "monitoring", label: "Monitoring — a fix is deployed" },
  { value: "resolved", label: "Resolved" },
];

/** How bad it is, which drives the page's headline indicator. */
export const INCIDENT_IMPACTS = [
  { value: "none", label: "None — maintenance or informational" },
  { value: "minor", label: "Minor" },
  { value: "major", label: "Major" },
  { value: "critical", label: "Critical" },
];

/** Public (redacted-safe) connection metadata. */
export interface StatuspageConnectionDisplay {
  pageId?: string;
  pageName?: string;
  subdomain?: string;
}

export function displayOf(
  connection: RedactedConnection | undefined,
): StatuspageConnectionDisplay {
  return (connection?.display ?? {}) as StatuspageConnectionDisplay;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset, so an update does not clear untouched fields. */
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
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class StatuspageClient {
  readonly pageId: string;

  constructor(private ctx: HookContext) {
    this.pageId = String(displayOf(ctx.connection).pageId ?? "");
  }

  /** The page an action works on — the connection's, unless overridden. */
  pageFor(override?: unknown): string {
    const explicit = String(override ?? "").trim();
    if (explicit) return explicit;
    if (this.pageId) return this.pageId;
    throw new Error(
      "no page id — this connection records none, so pass `pageId` explicitly (`page-list` " +
        "shows the pages this key can reach)",
    );
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
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
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Statuspage ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Follow Statuspage's `page`/`per_page` paging. */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    while (items.length < wantTotal) {
      const perPage = Math.min(100, Math.max(1, wantTotal - items.length));
      const chunk = await this.request<T[]>(path, {
        ...options,
        query: { ...options.query, page, per_page: perPage },
      });
      if (!Array.isArray(chunk) || chunk.length === 0) break;
      items.push(...chunk);
      if (chunk.length < perPage) break;
      page += 1;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}

/**
 * Turn a Statuspage error into something actionable.
 *
 * Statuspage answers `{"error":"…"}` for authentication and, for a validation
 * failure, an `{"error":{field:[messages]}}` tree naming what was wrong.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { error?: unknown };
    if (typeof body?.error === "string") detail = body.error;
    else if (body?.error) detail = JSON.stringify(body.error).slice(0, 300);
  } catch { /* not JSON */ }

  // 420 is Statuspage's own, alongside the usual 429 — a generic client treats
  // it as an unknown failure.
  if (status === 429 || status === 420) {
    return `${detail || "rate limited"} — Statuspage allows ONE request per second per API key, ` +
      "measured over a rolling minute";
  }
  return detail || `${status}`;
}
