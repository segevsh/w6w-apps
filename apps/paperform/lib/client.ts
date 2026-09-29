import type { HookContext } from "@w6w/types";

/**
 * Paperform API v1 REST client (`api.paperform.co/v1`).
 *
 * Verified on 2026-09-29 against Paperform's own OpenAPI 3.1 document, embedded
 * as JSON in every `paperform.readme.io/reference/*` page (`developers.paperform.co`,
 * the address in this pack's app-candidates note, is dead — it now serves an unrelated
 * internal job-application form) — plus live probes against `api.paperform.co` the same
 * day. Nothing here came from a third-party integration directory.
 *
 * ## One envelope: `{"status": "ok", "results": {…}}`
 *
 * Every success answers `status: "ok"` and the payload under `results` —
 * {@link PaperformClient.results} unwraps it. A **list** endpoint (forms, submissions,
 * partial submissions, webhooks, spaces) puts its `total`/`has_more`/`limit`/`skip`
 * pagination fields as **siblings of `results` at the top level**, not nested inside it —
 * confirmed by reading the OAS response schema's `allOf` merge, not assumed from another
 * app's shape. {@link PaperformClient.page} keeps that envelope intact so list actions can
 * report both together.
 *
 * ## Errors: JSON almost everywhere, HTML on a 429
 *
 * A 400/401/403/404/422/5xx answers `{"status":"error","error_type","message","details"?}`
 * — `error_type` is a stable machine string (`authentication`, `validation`, `permission`,
 * `not_found`, `server_error`) and `details` is an array of human-readable strings, present
 * on some errors and not others. A **429**, uniquely, answers `text/html` — Paperform's own
 * generic rate-limit page, not JSON — confirmed live on 2026-09-29 by bursting past the
 * 60-requests/minute ceiling; {@link formatPaperformError} falls back to a fixed message
 * for that case rather than trying to parse HTML as an error body.
 *
 * ## Auth does not distinguish a missing key from a wrong one
 *
 * Measured live on 2026-09-29: a request with **no** `Authorization` header and one with a
 * syntactically-plausible but fake bearer token both answer the **identical**
 * `401 {"status":"error","error_type":"authentication","message":"Could not authenticate",
 * "details":["Please pass a valid API Key in the Bearer header"]}`. `auth/api-key.ts`'s
 * `test` hook does not try to tell them apart, the same finding this pack's `cloudconvert`
 * app already documents for its own vendor.
 *
 * ## Rate limits: `X-RateLimit-*`, present on (almost) every response
 *
 * Per Paperform's own "Getting Started" page: `X-RateLimit-Limit` (60/minute) and
 * `X-RateLimit-Remaining` ride every response, including a 401 — measured live. On a 429,
 * `X-RateLimit-Reset` (a Unix timestamp) and `Retry-After` (seconds) are added; neither was
 * observed on a normal or 401 response, only once the ceiling was actually hit.
 * `health/request-rate.ts` reads these without spending a create call.
 */

export const API_BASE = "https://api.paperform.co";
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** The envelope every endpoint answers: `results`, plus pagination siblings on a list. */
export interface PaperformEnvelope<T> {
  status?: string;
  results?: T;
  total?: number;
  has_more?: boolean;
  limit?: number;
  skip?: number;
}

interface PaperformErrorBody {
  status?: string;
  error_type?: string;
  message?: string;
  details?: string[];
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

/** Keep an error message readable — a validation body can carry several detail lines. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Paperform's error body into one actionable line.
 *
 * A 429 answers `text/html`, not JSON — see the module doc — so that case is handled
 * before attempting `JSON.parse` at all, rather than falling through to a raw-HTML dump.
 */
export function formatPaperformError(
  status: number,
  method: string,
  path: string,
  raw: string,
  contentType: string | null,
): string {
  if (status === 429 || /text\/html/i.test(contentType ?? "")) {
    return `Paperform ${status} for ${method} ${path}: rate limited (60 requests/minute). ` +
      "Retry after the delay in the Retry-After header.";
  }

  let parsed: PaperformErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as PaperformErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message && !parsed?.error_type) {
    return `Paperform ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const parts = [
    `Paperform ${status}${parsed.error_type ? ` ${parsed.error_type}` : ""} for ${method} ${path}`,
    parsed.message,
    parsed.details && parsed.details.length > 0 ? parsed.details.join("; ") : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class PaperformClient {
  constructor(private ctx: HookContext) {}

  /** `{"results": …}` in, `results` out — the shape of every non-list endpoint. */
  async results<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<PaperformEnvelope<T>>(path, options);
    return body?.results as T;
  }

  /** The full envelope, including the pagination siblings — used by the `list*` actions. */
  async page<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<PaperformEnvelope<T>> {
    return await this.json<PaperformEnvelope<T>>(path, options);
  }

  /** Parse the body without unwrapping. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** `true` on `{"status":"ok"}` — used by the `delete*` actions. */
  async deleted(path: string, options: RequestOptions = {}): Promise<boolean> {
    const body = await this.json<{ status?: string }>(path, options);
    return body?.status === "ok";
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Paperform's OAS declares its array query params (`search_fields`) with no explicit
      // `style`/`explode`, which defaults to OpenAPI's `form`/`explode: true` — repeated
      // `key=value` instances, not a comma-joined single value. `papersignDocumentStatus` (out
      // of this app's scope) states `style: form, explode: true` explicitly for the same reason.
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item !== undefined && item !== null && item !== "") {
            url.searchParams.append(k, String(item));
          }
        }
      } else {
        url.searchParams.set(k, String(v));
      }
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
        formatPaperformError(
          res.status,
          init.method ?? "GET",
          url.pathname,
          detail,
          res.headers.get("content-type"),
        ),
      );
    }
    return res;
  }
}
