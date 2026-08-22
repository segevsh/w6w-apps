import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Qdrant's REST API — verified against Qdrant's own OpenAPI document
 * (`github.com/qdrant/qdrant`, `docs/redoc/master/openapi.json`, 53 paths,
 * fetched 2026-08-18).
 *
 * ## `points/query` is the endpoint, and most tutorials show the old one
 *
 * Qdrant used to have `points/search`, `points/recommend` and
 * `points/discover`. It now has **one**: `POST /collections/{name}/points/query`
 * — in the spec's own words, *"Universally query points. This endpoint covers
 * all capabilities of search, recommend, discover, filters. But also enables
 * hybrid and multi-stage queries."*
 *
 * The old paths are gone from the current spec while the internet is still full
 * of examples using them. This app uses `query` only.
 *
 * ## `with_payload` defaults differently on two endpoints in the same API
 *
 * On **query** it defaults to **false**: a search returns ids and scores and
 * **no data at all**. On **scroll** it defaults to **true**. A workflow that
 * searches and then reads a field off the results gets `undefined`, and the
 * search looked like it worked.
 *
 * So the actions here default `with_payload` to true and say why — the ids-only
 * form is a deliberate optimisation, not a sensible default for somebody
 * building a workflow.
 *
 * ## Writes return before they are applied
 *
 * `wait` defaults to false on upsert, delete and payload updates. The call
 * returns as soon as Qdrant has accepted the operation, not once it is
 * queryable — so "upsert then immediately search" reliably fails to find the
 * point. Every write action here defaults `wait` to **true**, which is the
 * behaviour a sequential workflow assumes it already has.
 *
 * ## The host is yours, and it has a port
 *
 * Qdrant is an open-source database first. The server is
 * `{protocol}://{hostname}:{port}` with `6333` the REST default — Qdrant Cloud
 * publishes `https://{cluster}.{region}.{cloud}.cloud.qdrant.io:6333`, and a
 * self-hosted instance is wherever it was put.
 */

/** Qdrant's default REST port. gRPC is 6334 and is not this API. */
export const DEFAULT_PORT = 6333;

/** Public (redacted-safe) connection metadata. */
export interface QdrantConnectionDisplay {
  /** The instance origin, including the port. */
  url?: string;
}

/**
 * Normalise a user-typed instance URL into an origin, adding Qdrant's REST port
 * when none was given.
 *
 * The port matters more here than usual: Qdrant serves gRPC on 6334 and REST on
 * 6333, and a URL without a port goes to 443 or 80 — which for a self-hosted
 * instance is usually nothing at all. Qdrant Cloud's own connection strings
 * include `:6333`, so pasting one works either way.
 */
export function normalizeUrl(raw: unknown): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("a Qdrant URL is required");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Qdrant URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Qdrant URL has no host: ${trimmed}`);
  // A URL with no port goes to 443, which on a self-hosted instance is usually
  // nothing at all.
  const port = url.port || String(DEFAULT_PORT);
  return `${url.protocol}//${url.hostname}:${port}`;
}

/** Read the instance origin off the redacted Connection. */
export function urlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as QdrantConnectionDisplay;
  const url = String(display.url ?? "").trim();
  if (!url) {
    throw new Error(
      "this connection has no Qdrant URL recorded — reconnect it so the app knows which instance " +
        "to reach",
    );
  }
  return normalizeUrl(url);
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
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

/**
 * A point id is a **positive integer or a UUID**, and nothing else.
 *
 * Qdrant rejects an arbitrary string, which catches anyone using a natural key
 * — a URL, a filename, an external id. The usual answer is to hash it into a
 * UUID and keep the original in the payload, and the error says so rather than
 * repeating Qdrant's own message about an unparseable id.
 */
export function pointId(value: unknown, field: string): string | number {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`\`${field}\` must be a non-negative integer or a UUID`);
    }
    return value;
  }
  const text = String(value ?? "").trim();
  if (/^\d+$/.test(text)) return Number(text);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) return text;
  throw new Error(
    `\`${field}\` must be a non-negative integer or a UUID — Qdrant accepts nothing else. For a ` +
      "natural key like a URL or filename, hash it into a UUID and keep the original in the " +
      "point's payload",
  );
}

/** A list of point ids, each validated. */
export function pointIds(value: unknown, field: string): Array<string | number> {
  const parsed = typeof value === "string" && value.trim().startsWith("[")
    ? json(value, field)
    : csv(value) ?? value;
  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items.filter((v) => v !== undefined && v !== null && v !== "").map((v) =>
    pointId(v, field)
  );
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the api-key header — the runtime
 * routes every request through the auth `sign` hook.
 */
export class QdrantClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = urlFromConnection(ctx.connection);
  }

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
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Qdrant ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;

    // Qdrant wraps everything: {time, status, result}.
    const body = JSON.parse(text) as { result?: T; status?: unknown; time?: number };
    return (Object.prototype.hasOwnProperty.call(body, "result") ? body.result : body) as T;
  }
}

/**
 * Turn a Qdrant error into something actionable.
 *
 * Failures arrive as `{"status": {"error": "…"}, "time": 0}` — the message is
 * nested inside `status`, which is also the field name a success uses for the
 * string `"ok"`. Reading `status` without checking its type produces
 * `[object Object]`.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { status?: { error?: string } | string };
    if (body?.status && typeof body.status === "object" && body.status.error) {
      detail = body.status.error;
    }
  } catch { /* not JSON */ }

  if (status === 401 || status === 403) {
    return `${detail} — check the API key. Qdrant keys are read-write or read-only, so a ` +
      "read-only key authenticates and is refused on every write";
  }
  if (status === 404) {
    return `${detail} — Qdrant answers 404 for a collection that does not exist, which is worth ` +
      "distinguishing from an empty one: `collection-exists` says which";
  }
  return detail || `${status}`;
}
