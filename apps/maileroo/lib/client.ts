import type { HookContext } from "@w6w/types";

/**
 * Maileroo has TWO API hosts and TWO credential kinds. Verified 2026-10-06 against
 * maileroo.com/docs/api-reference/*.
 *
 * - **Email API** — `https://smtp.maileroo.com/api/v2`, authenticated with a per-domain (or
 *   per-application) **sending key**. Responses: `{ success, message, data }`; errors carry
 *   `{ success: false, message }`. Sending, templated sending, bulk sending, scheduled emails.
 * - **Account API** (and the OTP Verification API under `/v1/verify`) —
 *   `https://api.maileroo.com/v1`, authenticated with an account **API key** that has granular
 *   scopes. Responses: `{ data }`; errors: `{ error: { message } }`.
 *
 * The Auth `sign` hook picks the credential from the request host, so an action only has to
 * pick the right base URL here. Neither credential is ever visible in this file.
 */
export const SEND_HOST = "smtp.maileroo.com";
export const SEND_BASE = `https://${SEND_HOST}/api/v2`;
export const ACCOUNT_HOST = "api.maileroo.com";
export const ACCOUNT_BASE = `https://${ACCOUNT_HOST}/v1`;

type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, Scalar>;
  body?: unknown;
  headers?: Record<string, string>;
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

/** The vendor's human message out of either error shape. */
export function vendorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as { message?: unknown; error?: unknown };
  if (typeof b.message === "string" && b.message) return b.message;
  if (b.error && typeof b.error === "object") {
    const m = (b.error as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return undefined;
}

export class MailerooError extends Error {
  constructor(message: string, public httpStatus: number) {
    super(message);
    this.name = "MailerooError";
  }
}

export function formatError(status: number, method: string, path: string, body: unknown, raw = "") {
  const text = vendorMessage(body) ?? raw.trim();
  const hint = status === 401
    ? " — the API key was rejected; check the matching key on the connection"
    : status === 403
    ? " — the key lacks the scope this endpoint needs, or the caller's IP is not on its allowlist"
    : status === 429
    ? " — rate limited (Account API: 180 requests per minute); retry after Retry-After"
    : "";
  return truncate(`Maileroo ${status} for ${method} ${path}: ${text}${hint}`, 1000);
}

export interface ApiResult {
  status: number;
  /** The envelope's `data` member (whole body when there is none). */
  data: unknown;
  /** Parsed JSON body (or raw text). */
  body: unknown;
}

export class MailerooClient {
  constructor(private ctx: HookContext) {}

  /** Email API (sending key). `path` is relative to `/api/v2`. */
  send(path: string, options: RequestOptions = {}): Promise<ApiResult> {
    return this.request(SEND_BASE, path, options);
  }

  /** Account API / OTP Verification API (account key). `path` is relative to `/v1`. */
  account(path: string, options: RequestOptions = {}): Promise<ApiResult> {
    return this.request(ACCOUNT_BASE, path, options);
  }

  private async request(base: string, path: string, options: RequestOptions): Promise<ApiResult> {
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const method = options.method ?? (options.body !== undefined ? "POST" : "GET");
    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    // No credential here: the Auth `sign` hook stamps the key that matches the host.
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch { /* non-JSON */ }

    // The Email API can answer `success: false` with an HTTP status the caller must not trust.
    const failed = body !== null && typeof body === "object" &&
      (body as { success?: unknown }).success === false;
    if (!res.ok || failed) {
      throw new MailerooError(
        formatError(res.status, method, url.pathname, body, typeof body === "string" ? body : ""),
        res.status,
      );
    }
    const envelope = body as { data?: unknown } | undefined;
    const data = envelope && typeof envelope === "object" && "data" in envelope
      ? envelope.data
      : body;
    return { status: res.status, data, body };
  }
}

/** Drop `undefined`/`null`/empty-string members. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/** A required string input, trimmed. */
export function need(value: unknown, name: string): string {
  const v = String(value ?? "").trim();
  if (!v) throw new Error(`${name} is required`);
  return v;
}

/** Path-segment-safe id. */
export function seg(value: unknown, name: string): string {
  return encodeURIComponent(need(value, name));
}

/** Page envelope shared by the Account API list endpoints. */
export function pageInfo(d: Record<string, unknown>) {
  const page = Number(d.page ?? 1);
  const totalPages = Number(d.total_pages ?? 1);
  return { page, perPage: d.per_page, total: d.total, totalPages, hasMore: page < totalPages };
}
