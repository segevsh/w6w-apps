import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Meilisearch's REST API — verified against the OpenAPI 3.1 document
 * Meilisearch publishes in its own `meilisearch/open-api` repository
 * (`open-api.json`, engine v1.15.2, 431KB, fetched 2026-08-18).
 *
 * **There is no vendor host.** The spec's `servers` block is `/` because a
 * Meilisearch instance is wherever you run it — your own machine, your own
 * cluster, or a Meilisearch Cloud project on a per-project hostname. So the
 * base URL is a connection field, and the app's egress allowlist is `["*"]`,
 * the same posture this pack uses for `mattermost`, `ghost`, `grafana` and the
 * other self-hostable apps. That is a deliberately wide allowlist, and it is
 * the price of an app whose server address only the operator knows.
 */

/** Public (redacted-safe) connection metadata. */
export interface MeilisearchConnectionDisplay {
  /** The instance origin, e.g. `https://ms-abc123.sfo.meilisearch.io`. */
  baseUrl?: string;
  /** The default index, when one was chosen. */
  indexUid?: string;
}

/**
 * Normalise a user-typed instance URL into a bare origin.
 *
 * People paste all of `search.example.com`, `https://search.example.com/`,
 * `http://localhost:7700` and a Cloud project URL with a trailing path. All
 * mean the same instance.
 *
 * A missing scheme defaults to `https`: an API key in flight deserves TLS, and
 * producing `http://` from a bare hostname would silently downgrade the
 * credential's transport. `http://localhost:7700` — Meilisearch's own
 * quickstart address — survives unchanged, because it says `http://` itself.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Meilisearch URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Meilisearch URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Meilisearch URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the instance origin off the redacted Connection. Never touches the credential. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as MeilisearchConnectionDisplay;
  if (display.baseUrl) return normalizeBaseUrl(display.baseUrl);
  throw new Error(
    "this Meilisearch connection records no instance URL — reconnect it so the URL can be stored",
  );
}

/** Resolve the index: the action's override wins, else the connection's default. */
export function resolveIndex(
  connection: RedactedConnection | undefined,
  override?: unknown,
): string {
  const explicit = String(override ?? "").trim();
  if (explicit) return explicit;
  const display = (connection?.display ?? {}) as MeilisearchConnectionDisplay;
  const fromConnection = display.indexUid?.trim();
  if (fromConnection) return fromConnection;
  throw new Error(
    "no index — set a default on the connection or pass `indexUid` on the action",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset so a PATCH does not clear untouched settings. */
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
 * What every write returns — a receipt, not a result.
 *
 * This is the single most surprising thing about Meilisearch and the reason
 * half this app's documentation exists. Adding documents, changing settings,
 * creating an index and deleting one all answer immediately with
 * `{taskUid, indexUid, status: "enqueued", type, enqueuedAt}`. The work has
 * **not happened yet**. A workflow that adds a document and then searches for
 * it finds nothing, and neither call errors.
 *
 * `status` here is always `enqueued`; the terminal states (`succeeded`,
 * `failed`, `canceled`) only appear on `GET /tasks/{taskUid}`. So a task that
 * fails — a malformed document, a bad filter expression — reports success at
 * the point the write was made, and the failure surfaces minutes later or not
 * at all.
 *
 * Every writing action here therefore returns the task verbatim and says so in
 * its output labels, and `task-get` is documented as the other half of the
 * operation rather than as an afterthought.
 */
export interface SummarizedTask {
  taskUid?: number;
  indexUid?: string | null;
  status?: string;
  type?: string;
  enqueuedAt?: string;
}

/** The task states that mean the work is over, one way or another. */
export const TERMINAL_TASK_STATES = ["succeeded", "failed", "canceled"] as const;

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class MeilisearchClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Meilisearch takes repeated values as one comma-separated parameter,
      // not as repeated keys — `?statuses=failed,canceled`.
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Meilisearch's error envelope is `{message, code, type, link}`. `code`
      // is the machine-readable half — `index_not_found`,
      // `invalid_search_filter`, `invalid_api_key` — and `link` points at the
      // documentation for it, so the whole body is surfaced.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Meilisearch ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Meilisearch's `offset`/`limit` paging, collecting `results`.
   *
   * **There are two paging contracts in this API and they are not
   * interchangeable.** `/indexes`, `/keys` and the document listing answer
   * `{results, offset, limit, total}` and page by `offset` — this method.
   * `/tasks` and `/batches` answer `{results, total, limit, from, next}` and
   * page by a **cursor** (`next` feeds the following request's `from`) —
   * `requestAllFrom` below. Using the offset walk on tasks silently re-reads
   * the first page forever, because `offset` is not a parameter there and is
   * ignored rather than rejected.
   *
   * The **search** endpoint is a third shape again: its envelope is `hits`, and
   * its paging lives in the request body, so search does not go through either.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let offset = 0;
    while (items.length < wantTotal) {
      const limit = Math.min(1000, Math.max(1, wantTotal - items.length));
      const page = await this.request<{ results?: T[]; total?: number }>(path, {
        ...options,
        query: { ...options.query, offset, limit },
      });
      const chunk = page?.results ?? [];
      items.push(...chunk);
      if (chunk.length < limit) break;
      offset += chunk.length;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }

  /**
   * Follow the **cursor** paging that `/tasks` and `/batches` use.
   *
   * The response carries `next`, the uid to start the following page from, and
   * omits it (or sends null) on the last page. This is a different mechanism
   * from `offset`, not a different spelling of it — see `requestAll`.
   */
  async requestAllFrom<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let from: number | undefined;
    while (items.length < wantTotal) {
      const limit = Math.min(1000, Math.max(1, wantTotal - items.length));
      const page = await this.request<{ results?: T[]; next?: number | null }>(path, {
        ...options,
        query: { ...options.query, limit, from },
      });
      const chunk = page?.results ?? [];
      items.push(...chunk);
      const next = page?.next;
      if (next === undefined || next === null || chunk.length === 0) break;
      from = next;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
