import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Documenso's **v2** API — verified against the OpenAPI 3.0.3 document
 * Documenso serves from its own app host
 * (`https://app.documenso.com/api/v2/openapi.json`, 650KB, 89 paths, fetched
 * 2026-08-18), whose `servers` block states
 * `https://app.documenso.com/api/v2`.
 *
 * **Which API, and why it matters twice over.** Documenso has three generations
 * live at once, and picking the wrong one is the easiest mistake here:
 *
 *   - **v1** (`/api/v1/*`) — every operation in its document is marked
 *     *"This endpoint is deprecated, but will continue to be supported"*. It is
 *     also what most tutorials show.
 *   - **v2's `/document/*` and `/template/*`** — **52 of v2's 89 operations**
 *     are deprecated too, each pointing at the same migration guide: *"this
 *     endpoint is being replaced by the Envelope API"*.
 *   - **v2's `/envelope/*`** — 31 operations, none deprecated. This is the
 *     current model, and it is the only one this app uses.
 *
 * An envelope is the thing being signed: it holds the documents, the
 * recipients, the fields placed on them and the audit trail. A "document" in
 * the old model was one envelope with one file.
 */
export const API_PATH = "/api/v2";
export const CLOUD_BASE_URL = "https://app.documenso.com";

/** Public (redacted-safe) connection metadata. */
export interface DocumensoConnectionDisplay {
  /** The instance origin — the cloud, or a self-hosted server. */
  baseUrl?: string;
}

/**
 * Normalise a user-typed instance URL into a bare origin.
 *
 * Documenso is self-hostable and most deployments are, so the URL is asked for
 * rather than assumed. The `/api/v2` strip matters because Documenso's own
 * examples end in it, and producing `/api/v2/api/v2/envelope` would be a
 * baffling 404.
 *
 * A missing scheme defaults to `https`: an API key in flight deserves TLS.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return CLOUD_BASE_URL;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Documenso URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Documenso URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the instance origin off the redacted Connection; the cloud is the default. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as DocumensoConnectionDisplay;
  return display.baseUrl ? normalizeBaseUrl(display.baseUrl) : CLOUD_BASE_URL;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
  /** Sends the body as multipart form data with one `payload` field. */
  asFormPayload?: boolean;
}

/** Drop keys the caller left unset so an update does not clear untouched fields. */
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
export class DocumensoClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${API_PATH}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      if (options.asFormPayload) {
        // `envelope/use` takes multipart/form-data with a JSON `payload` field
        // and optional `files`. The content-type header is deliberately NOT set
        // — the runtime has to add the multipart boundary, and a hand-written
        // header without one makes the body unparseable.
        const form = new FormData();
        form.set("payload", JSON.stringify(options.body));
        init.body = form;
      } else {
        headers["content-type"] = "application/json";
        init.body = JSON.stringify(options.body);
      }
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Documenso answers a validation failure with a Zod issue tree under
      // `bodyErrors` / `headerErrors`, which names the exact field — far more
      // useful than the top-level message, so the whole body is surfaced.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Documenso ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Documenso's `page`/`perPage` paging, collecting `data`.
   *
   * The list endpoints answer `{data: [...], count, currentPage, perPage,
   * totalPages}`. `page` is **1-based**; starting at 0 returns page 1 again.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    while (items.length < wantTotal) {
      const perPage = Math.min(100, Math.max(1, wantTotal - items.length));
      const body = await this.request<{ data?: T[]; totalPages?: number }>(path, {
        ...options,
        query: { ...options.query, page, perPage },
      });
      const chunk = body?.data ?? [];
      items.push(...chunk);
      const totalPages = Number(body?.totalPages ?? 1);
      if (chunk.length === 0 || page >= totalPages) break;
      page += 1;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
