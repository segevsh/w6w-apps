import type { HookContext } from "@w6w/types";

/**
 * Firecrawl API v2 REST client.
 *
 * Everything in this module was verified on 2026-09-15 against Firecrawl's own
 * machine-readable OpenAPI 3.0 document
 * (`docs.firecrawl.dev/api-reference/v2-openapi.json`, 413,603 bytes,
 * `info.version` `v2`), and against live, unauthenticated probes of
 * `api.firecrawl.dev` (`/scrape` and `/search` both work with no credential at
 * all — see `auth/api-key.ts`). Every other endpoint this app calls needs a
 * real key to reach and was verified against the spec only, never a
 * third-party integration directory.
 *
 * ## One host, one prefix
 *
 * The OpenAPI document declares exactly one server, `https://api.firecrawl.dev/v2`.
 * There is no regional host and no sandbox environment.
 *
 * ## The envelope is `{"success": true, "data": …}` — except when it isn't
 *
 * `scrape` and `search` wrap their payload under `data`; the async job
 * endpoints (`crawl`, `batch/scrape`, `extract`) return `id`/`url` fields
 * directly at the top level instead, and their *status* endpoints
 * (`GET /crawl/{id}`, `GET /batch/scrape/{id}`) don't carry a `success` field
 * at all — `data` there is the array of scraped pages, not an envelope. So the
 * client exposes {@link FirecrawlClient.data} (unwrap) and
 * {@link FirecrawlClient.json} (parse, no unwrap) rather than pretending there
 * is one shape, mirroring how this pack's `apify` app handles its own three
 * response shapes.
 *
 * ## A `200` can still mean failure — read `success`, not just the status code
 *
 * `POST /scrape` against a domain that fails DNS resolution answers **HTTP
 * 200** with `{"success": false, "code": "SCRAPE_DNS_RESOLUTION_ERROR",
 * "error": "DNS resolution failed for hostname …"}` — measured live on
 * 2026-09-15. Checking only `res.ok` would report that scrape as a success
 * with an empty page. Every response this client parses is therefore checked
 * for `success === false` even when the HTTP status is 2xx.
 *
 * ## Validation errors carry a structured `details` array
 *
 * A `400` (missing/invalid field) answers
 * `{"success": false, "code": "BAD_REQUEST", "error": "Bad Request",
 * "details": [{"path": ["url"], "message": "…"}]}` — measured live. The
 * `error` string alone ("Bad Request") is useless; {@link formatFirecrawlError}
 * appends each `details` entry's path and message instead of discarding them.
 */

/** The one and only API origin, already including the `/v2` prefix. */
export const API_BASE = "https://api.firecrawl.dev/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface FirecrawlDetail {
  path?: Array<string | number>;
  message?: string;
}

interface FirecrawlErrorBody {
  success?: boolean;
  code?: string;
  error?: string;
  details?: FirecrawlDetail[];
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Keep an error message readable — a validation body can carry many `details` entries. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length - max} chars truncated)`;
}

/**
 * Turn a Firecrawl error body into one actionable line.
 *
 * `code` is kept because it is a stable machine token (`SCRAPE_DNS_RESOLUTION_ERROR`,
 * `BAD_REQUEST`, `SCRAPE_NO_CACHED_DATA`, …); `details` — present on validation
 * failures — is flattened from `{path, message}` pairs into `path: message` so
 * the specific field that failed is never silently dropped.
 */
export function formatFirecrawlError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: FirecrawlErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as FirecrawlErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (!parsed.error && !parsed.details)) {
    return `Firecrawl ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const parts = [
    `Firecrawl ${status}${parsed.code ? ` ${parsed.code}` : ""} for ${method} ${path}`,
    parsed.error,
  ];
  if (parsed.details?.length) {
    parts.push(
      parsed.details
        .map((d) => `${(d.path ?? []).join(".") || "(body)"}: ${d.message ?? "invalid"}`)
        .join("; "),
    );
  }
  if (status === 429) {
    parts.push("Firecrawl rate-limited this request; retry with backoff");
  }
  return truncate(parts.filter(Boolean).join(": "), 1200);
}

export class FirecrawlClient {
  constructor(private ctx: HookContext) {}

  /** `{"success": true, "data": …}` in, `data` out. Used by `scrape` and `search`. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<{ data?: T }>(path, options);
    return body?.data as T;
  }

  /**
   * Parse the body without unwrapping.
   *
   * Used by every endpoint that does not wrap its payload under `data` at the
   * top level: the async job starters (`id`/`url` directly), the job-status
   * endpoints (whose OWN `data` field is the page array, not an envelope), and
   * `map` (`links` directly).
   */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    const body = JSON.parse(text) as { success?: boolean } & Record<string, unknown>;
    // A 2xx response can still be a failure — see the DNS-resolution finding above.
    if (body?.success === false) {
      throw new Error(
        formatFirecrawlError(res.status, options.method ?? "GET", path, text),
      );
    }
    return body as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null) continue;
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
      throw new Error(
        formatFirecrawlError(res.status, init.method ?? "GET", path, detail),
      );
    }
    return res;
  }
}
