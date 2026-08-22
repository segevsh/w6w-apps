import type { HookContext } from "@w6w/types";

/**
 * Pinecone's REST API — verified against the OpenAPI documents Pinecone
 * publishes itself ([`pinecone-io/pinecone-api`](https://github.com/pinecone-io/pinecone-api),
 * `2026-04/db_control_2026-04.oas.yaml`, `db_data_2026-04.oas.yaml` and
 * `inference_2026-04.oas.yaml`, fetched 2026-08-18), and measured against the
 * live host the same day.
 *
 * ## Two planes, two hosts — and only one of them is a constant
 *
 * This is the thing to understand before anything else works:
 *
 *   - The **control plane** is `https://api.pinecone.io`. Creating, listing,
 *     describing and deleting indexes, plus backups and the inference models,
 *     all live there. So does the whole Inference API.
 *   - The **data plane** — upsert, query, fetch, delete, stats — lives on a
 *     **per-index host**, e.g.
 *     `https://my-index-4xdf9s2.svc.aped-4627-b74a.pinecone.io`. The db_data
 *     spec's `servers` block is literally `https://{index_host}` with the host
 *     as a variable, because Pinecone itself cannot name it ahead of time.
 *
 * An index's host is returned by `GET /indexes/{name}` as `host`, and it does
 * not change over the life of the index. Rather than making every workflow
 * paste a hostname it does not know, the data actions take an **index name**
 * and resolve the host through that call, which is why a data action normally
 * costs two requests. Every one of them also accepts an explicit **Index Host**
 * to skip the lookup, which is what a hot loop should use.
 *
 * ## The API version header is not optional in practice
 *
 * Pinecone versions its API by date and negotiates through the
 * `X-Pinecone-Api-Version` header. Measured 2026-08-18, **omitting it does not
 * get you the latest — it gets you `2024-04`**, the oldest version Pinecone
 * still serves, echoed back in the response's own
 * `x-pinecone-api-version` header. An unsupported value answers `403` with the
 * full list:
 *
 *   {"error":{"code":"FORBIDDEN","message":"Unsupported API version '2099-01'.
 *    Supported versions: 2024-04, 2024-07, 2024-10, 2025-01, 2025-04, 2025-10,
 *    2026-04, 2026-07. …"},"status":403}
 *
 * So this app pins the version on **every** request, and pins it to `2026-04`
 * rather than to the newest thing the server names: `2026-07` exists, but the
 * only spec Pinecone publishes for it is `nexus_2026-07.oas.yaml` — a different
 * product. `2026-04` is the newest version with published `db_control`,
 * `db_data` and `inference` documents, which are the three this app was built
 * against.
 *
 * ## Errors are not JSON when authentication fails
 *
 * Measured 2026-08-18: a bad key answers `401` with `content-type: text/html`
 * and a fifteen-byte body reading `Invalid API key`; no key at all answers the
 * same way with `Missing api-key header`. Every *other* error is a JSON
 * envelope (`{"error":{"code","message"},"status"}`). A client that assumes
 * JSON produces a parser error instead of the reason, so this one reads text
 * first and only then tries to parse it.
 */
export const CONTROL_BASE_URL = "https://api.pinecone.io";

/**
 * The API version this app is written against — pinned on every request. See
 * the note above on why it is not the newest version the server accepts.
 */
export const API_VERSION = "2026-04";

/** Pinecone's own ceiling on a single upsert: 1000 records, or 2 MB. */
export const MAX_UPSERT_VECTORS = 1000;

/**
 * The ceiling when the records carry **text** instead of vectors, because
 * Pinecone embeds them server-side. It is an order of magnitude lower, and
 * exceeding it fails the whole batch.
 */
export const MAX_UPSERT_TEXT_RECORDS = 96;

/** Pinecone's ceiling on ids in one delete, and on `top_k` in one query. */
export const MAX_DELETE_IDS = 1000;
export const MAX_TOP_K = 10000;

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
  /**
   * Overrides the request content type, and with it how `body` is encoded.
   * `application/x-ndjson` sends an array as one JSON object per line, which is
   * what the integrated-embedding upsert route takes — see `record-upsert-text`.
   */
  contentType?: string;
  /** Absolute host for a data-plane call. Defaults to the control plane. */
  host?: string;
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
 * Read a vector out of a param that may be a JSON array, a live array, or a
 * comma-separated list of numbers.
 *
 * A dimension mismatch is the most common Pinecone error and the least
 * self-explanatory — the API answers `400 Vector dimension 384 does not match
 * the dimension of the index 1536` — so the count is surfaced in the failure
 * here rather than left to the caller to work out.
 */
export function vector(value: unknown, field: string): number[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = typeof value === "string" && !value.trim().startsWith("[")
    ? value.split(",")
    : json(value, field);
  if (!Array.isArray(raw)) throw new Error(`\`${field}\` must be an array of numbers`);
  const out = raw.map((n) => {
    const num = typeof n === "number" ? n : Number(String(n).trim());
    if (!Number.isFinite(num)) throw new Error(`\`${field}\` contains a non-numeric value: ${n}`);
    return num;
  });
  return out.length ? out : undefined;
}

/** An index as the control plane describes it. Only the fields this app reads. */
export interface IndexModel {
  name?: string;
  host?: string;
  dimension?: number;
  metric?: string;
  vector_type?: string;
  deletion_protection?: string;
  embed?: { model?: string; field_map?: Record<string, string> };
  status?: { ready?: boolean; state?: string };
  spec?: { serverless?: { cloud?: string; region?: string }; pod?: Record<string, unknown> };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets `Api-Key` — the runtime routes
 * every request through the auth `sign` hook.
 */
export class PineconeClient {
  /** Index name → data-plane host, for the life of one action call. */
  private hosts = new Map<string, string>();

  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const base = options.host ?? CONTROL_BASE_URL;
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      // Never optional: without it Pinecone serves 2024-04, not the latest.
      "x-pinecone-api-version": API_VERSION,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      const contentType = options.contentType ?? "application/json";
      headers["content-type"] = contentType;
      init.body = contentType === "application/x-ndjson"
        // NDJSON: one JSON object per LINE, not a JSON array. Pinecone's
        // upsert-text route declares this content type and only this one.
        ? (options.body as unknown[]).map((item) => JSON.stringify(item)).join("\n")
        : JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Auth failures are PLAIN TEXT with content-type text/html; everything
      // else is a JSON error envelope. Read text first, then try to parse.
      const text = await res.text().catch(() => "");
      let detail = text.trim();
      try {
        const parsed = JSON.parse(text) as { error?: { code?: string; message?: string } };
        if (parsed?.error) {
          detail = [parsed.error.code, parsed.error.message].filter(Boolean).join(": ");
        }
      } catch { /* not JSON — the raw text IS the message */ }
      throw new Error(
        `Pinecone ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Describe one index on the control plane. */
  async describeIndex(name: string): Promise<IndexModel> {
    return await this.request<IndexModel>(`/indexes/${encodeURIComponent(name)}`);
  }

  /**
   * The data-plane host for an index.
   *
   * An explicit host short-circuits the lookup — that is the whole point of
   * offering one. Otherwise the index is described once and the answer is
   * remembered for the rest of this action's run, so a loop over namespaces
   * does not describe the same index repeatedly.
   *
   * The scheme is added here rather than asked for, because `host` comes back
   * bare (`my-index-4xdf9s2.svc.aped-4627-b74a.pinecone.io`) and a URL without
   * one is not a URL.
   */
  async hostFor(indexName: string, explicitHost?: string): Promise<string> {
    const given = String(explicitHost ?? "").trim();
    if (given) return withScheme(given);

    const name = String(indexName ?? "").trim();
    if (!name) {
      throw new Error("give an `indexName` (or an `indexHost` to skip the lookup)");
    }
    const cached = this.hosts.get(name);
    if (cached) return cached;

    const index = await this.describeIndex(name);
    if (!index?.host) {
      throw new Error(
        `Pinecone described index "${name}" without a host — it may still be creating`,
      );
    }
    const host = withScheme(index.host);
    this.hosts.set(name, host);
    return host;
  }

  /** A data-plane call against the index's own host. */
  async data<T = unknown>(
    indexName: string,
    explicitHost: string | undefined,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const host = await this.hostFor(indexName, explicitHost);
    return await this.request<T>(path, { ...options, host });
  }
}

/** `example.svc.pinecone.io` → `https://example.svc.pinecone.io`, idempotently. */
export function withScheme(host: string): string {
  const trimmed = String(host ?? "").trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
