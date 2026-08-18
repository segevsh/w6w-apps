import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Sanity's **Content Lake** HTTP API.
 *
 * Every path, parameter and behaviour here was taken from Sanity's own
 * reference documentation (`sanity.io/docs/http-reference/mutation`,
 * `/content-lake/api-cdn`, `/content-lake/mutation-patterns`, read 2026-08-18)
 * and the host layout was verified against the live API the same day.
 *
 * ## The project is in the hostname, not the path
 *
 * Every data call goes to `https://{projectId}.api.sanity.io/{version}/…`.
 * Only the **management** API — projects and datasets — lives on the bare
 * `api.sanity.io`. That is why this app's egress allowlist has to cover
 * `*.api.sanity.io` and not one host.
 *
 * ## Reads: the live API, not the CDN — by Sanity's own advice
 *
 * There are two read hosts and they answer differently:
 *
 *   - `{projectId}.api.sanity.io` — uncached, always the freshest content;
 *   - `{projectId}.apicdn.sanity.io` — the cached CDN, fast and cheap.
 *
 * Sanity's guidance is explicit about which an integration should use: *"When
 * building integrations with Sanity or responding to webhooks, we recommend
 * using the API to capture the latest saved content."* A workflow triggered by
 * a webhook and then reading through the CDN can read the content as it was
 * *before* the change that woke it.
 *
 * Worse, the failure mode is invisible: **"If Sanity's Content Lake is
 * unavailable, the API CDN will return the last cached content for up to two
 * hours."** A workflow reading through the CDN keeps succeeding through an
 * outage, on stale data.
 *
 * So this app defaults to the live API, and the CDN is an explicit per-
 * connection opt-in for the case it is actually for — high-volume reads of
 * content that does not need to be current.
 *
 * The CDN also only serves reads: it caches `/data/query` and `/graphql`, and
 * **rejects every other POST**, so mutations always go to the live host
 * whatever the connection says.
 *
 * ## The API version is a date, and pinning it is the point
 *
 * Sanity versions by date and treats the version as a contract: a pinned date
 * keeps behaving the way it did when it was pinned. `vX` exists and is the
 * *unstable* channel — it tracks whatever is newest, which is the opposite of
 * what an integration wants.
 */

/** The dated API version this app is written against. */
export const API_VERSION = "v2025-02-19";

/** The management API — projects and datasets. Not project-scoped. */
export const MANAGEMENT_HOST = "https://api.sanity.io";

/** Public (redacted-safe) connection metadata. */
export interface SanityConnectionDisplay {
  projectId?: string;
  dataset?: string;
  useCdn?: boolean;
  projectName?: string;
}

export function displayOf(connection: RedactedConnection | undefined): SanityConnectionDisplay {
  return (connection?.display ?? {}) as SanityConnectionDisplay;
}

/** The data host for a project — cached or live. */
export function dataHost(projectId: string, useCdn = false): string {
  const domain = useCdn ? "apicdn.sanity.io" : "api.sanity.io";
  return `https://${encodeURIComponent(projectId)}.${domain}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /**
   * Force the live host even on a CDN connection. Every write sets this,
   * because the CDN rejects any POST that is not a query.
   */
  live?: boolean;
  /** Call the management API rather than the project's data host. */
  management?: boolean;
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
 * A document id, with the draft prefix handled explicitly.
 *
 * Sanity models a draft as a *separate document* whose id is the published id
 * with a `drafts.` prefix — so `article-1` and `drafts.article-1` are two
 * documents, and a query that finds one will not find the other. Nearly every
 * surprise in a Sanity integration comes from this.
 */
export const DRAFT_PREFIX = "drafts.";

export function isDraftId(id: string): boolean {
  return id.startsWith(DRAFT_PREFIX);
}

export function publishedIdOf(id: string): string {
  return isDraftId(id) ? id.slice(DRAFT_PREFIX.length) : id;
}

export function draftIdOf(id: string): string {
  return isDraftId(id) ? id : `${DRAFT_PREFIX}${id}`;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class SanityClient {
  readonly projectId: string;
  readonly dataset: string;
  readonly useCdn: boolean;

  constructor(private ctx: HookContext) {
    const display = displayOf(ctx.connection);
    this.projectId = String(display.projectId ?? "");
    this.dataset = String(display.dataset ?? "");
    this.useCdn = display.useCdn === true;
    if (!this.projectId) {
      throw new Error(
        "this connection has no project id — reconnect the Sanity account, since the project " +
          "is part of every data request's hostname",
      );
    }
  }

  /** The host a call should go to. Writes always force the live one. */
  host(options: RequestOptions = {}): string {
    if (options.management) return MANAGEMENT_HOST;
    return dataHost(this.projectId, this.useCdn && !options.live);
  }

  /** The dataset an action works on — the connection's, unless overridden. */
  datasetFor(override?: unknown): string {
    const explicit = String(override ?? "").trim();
    if (explicit) return explicit;
    if (this.dataset) return this.dataset;
    throw new Error(
      "no dataset — this connection records none, so pass `dataset` explicitly " +
        "(`dataset-list` shows what the project has)",
    );
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.host(options)}/${API_VERSION}${path}`);
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
        `Sanity ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Read a **NDJSON** response — the export endpoint answers one doc per line. */
  async requestNdjson(path: string, options: RequestOptions = {}): Promise<unknown[]> {
    const url = new URL(`${this.host(options)}/${API_VERSION}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const res = await this.ctx.fetch(url.toString(), {
      headers: { accept: "application/x-ndjson" },
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Sanity ${res.status} for GET ${url.pathname}: ${describeError(res.status, text)}`,
      );
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

/**
 * Turn a Sanity error body into something actionable.
 *
 * Sanity answers with `{statusCode, error, message}` and, for a GROQ syntax
 * error, a `description` naming the position — which is the half worth
 * surfacing, since a query is the thing most likely to be wrong.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 400);
  try {
    const body = JSON.parse(text) as {
      message?: string;
      error?: string | { description?: string; type?: string };
      description?: string;
    };
    if (typeof body?.error === "object" && body.error?.description) {
      detail = body.error.description;
    } else if (body?.message) {
      detail = body.message;
    } else if (typeof body?.error === "string") {
      detail = body.error;
    }
  } catch { /* not JSON */ }

  if (status === 429) {
    return `${detail} — Sanity allows 500 concurrent queries and 100 concurrent mutations per ` +
      "dataset, and 25 mutations a second per IP";
  }
  return detail || `${status}`;
}
