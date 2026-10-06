import type { HookContext } from "@w6w/types";

/**
 * Lexware Office (formerly lexoffice) Public API client.
 *
 * Verified 2026-10-06 against the vendor's single-page reference
 * (`https://developers.lexware.io/docs/`) and unauthenticated probes of `api.lexware.io`.
 *
 * ## Shapes worth knowing
 *
 *  - One host, `api.lexware.io`, version in the path (`/v1`). The old `api.lexoffice.io`
 *    gateway was retired in December 2025 and is not allowlisted.
 *  - Auth is `Authorization: Bearer <api-key>`, stamped by `sign`.
 *  - **Paged lists** answer a Spring-style envelope: `{content, first, last, totalPages,
 *    totalElements, numberOfElements, size, number, sort}`. `page` is zero-based, `size`
 *    defaults to 25 and is capped at 250 on articles, contacts, voucherlist, vouchers.
 *  - **Unpaged lists** (countries, posting categories, payment conditions) are bare arrays.
 *  - **Writes answer an action result** `{id, resourceUri, createdDate, updatedDate, version}`.
 *  - **Three different error bodies**, depending on the layer that refused:
 *      1. the AWS gateway: `{"message": "Unauthorized"}` (401), a key=value complaint (403),
 *         `Internal server error or rate limit exceeded` (500), `Endpoint request timed out` (504);
 *      2. the legacy shape `{"IssueList":[{i18nKey, source, type, ...}]}` on contacts, files
 *         and vouchers;
 *      3. the regular shape `{timestamp, status, error, path, traceId, message, details[]}`
 *         on everything else.
 *    {@link formatLexwareError} reads all three.
 *  - Limit: 2 requests per second across the whole API (token bucket); 429 when exceeded.
 *    No rate-limit header is documented.
 *  - PUT needs the entity's current `version` (optimistic locking); a stale one is a 409.
 */
export const API_BASE = "https://api.lexware.io";
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Drop keys the caller left unset; `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Path-escape a caller-supplied id so `/` or `?` cannot leave the segment. */
export function encodeId(id: unknown): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Accept a JSON object, or a string holding one, for a `json` param. */
export function asObject(v: unknown, label: string): Record<string, unknown> {
  let value = v;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new Error(`${label} must be valid JSON`);
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

interface RegularDetail {
  violation?: string;
  field?: string;
  message?: string;
}

/**
 * One line from whichever of the three error bodies came back (see file header). Keeps the
 * vendor's own words — field paths and violation codes — because a bare 406 hides which field.
 */
export function formatLexwareError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: Record<string, unknown> | null = null;
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === "object") parsed = v as Record<string, unknown>;
  } catch { /* not JSON */ }

  const hint = status === 429
    ? " — limit is 2 requests per second across the API; retry with backoff"
    : status === 402
    ? " — the Lexware contract does not allow this action"
    : status === 409
    ? " — conflict: the `version` sent is stale, or the document is in the wrong state"
    : "";

  const issues = parsed?.IssueList;
  if (Array.isArray(issues) && issues.length > 0) {
    const lines = issues.map((i: Record<string, unknown>) =>
      `${i.i18nKey ?? i.type ?? "issue"}${i.source ? ` (${i.source})` : ""}`
    );
    return truncate(`Lexware ${status} for ${method} ${path}: ${lines.join("; ")}${hint}`, 1000);
  }
  if (parsed && typeof parsed.message === "string") {
    const details = Array.isArray(parsed.details)
      ? (parsed.details as RegularDetail[]).map((d) =>
        `${d.field ?? "?"}: ${d.violation ?? d.message ?? "invalid"}`
      )
      : [];
    const tail = details.length ? ` [${details.join("; ")}]` : "";
    return truncate(
      `Lexware ${status} for ${method} ${path}: ${parsed.message}${tail}${hint}`,
      1000,
    );
  }
  return `Lexware ${status} for ${method} ${path}: ${truncate(raw)}${hint}`;
}

function base64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export interface DownloadedFile {
  contentType: string;
  fileName: string | null;
  size: number;
  base64: string;
}

export class LexwareClient {
  constructor(private ctx: HookContext) {}

  private url(path: string, query?: Record<string, QueryValue>): URL {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    return url;
  }

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const url = this.url(path, options.query);
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatLexwareError(res.status, method, url.pathname, detail));
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Download a binary document (`Accept` picks the representation, e.g. PDF vs XML). */
  async file(path: string, accept: string): Promise<DownloadedFile> {
    const url = this.url(path);
    const res = await this.ctx.fetch(url.toString(), { method: "GET", headers: { accept } });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatLexwareError(res.status, "GET", url.pathname, detail));
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const disposition = res.headers.get("content-disposition") ?? "";
    const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1];
    return {
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
      fileName: name ? decodeURIComponent(name) : null,
      size: bytes.length,
      base64: base64(bytes),
    };
  }
}
