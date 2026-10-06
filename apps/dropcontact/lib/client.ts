import type { HookContext } from "@w6w/types";

/**
 * Dropcontact API. Verified 2026-10-06 against https://developer.dropcontact.com/ and live
 * unauthenticated probes of the host.
 *
 * ## One host, one header
 *
 * Every call goes to `https://api.dropcontact.com/v1/enrich/...` (`api.dropcontact.io` is an
 * AWS API Gateway that answers every path with `403 Missing Authentication Token`; it is not
 * the API). The token travels in `X-Access-Token`, added by the Auth `sign` hook.
 *
 * ## The envelope, and why the status code is not the verdict
 *
 * Every body is `{ error, success, ... }`. A refusal is `{"error":true,"reason":"...",
 * "success":false}` and the verdict comes from `reason`. A batch that is still processing is
 * NOT an error: it is HTTP 200 `{"error":false,"success":false,"reason":"Request not ready
 * yet, try again in 30 seconds"}`, so `success: false` alone cannot mean failure. Only
 * `error: true` does.
 */
export const API_HOST = "api.dropcontact.com";
export const API_BASE = `https://${API_HOST}`;
export const ENRICH_PATH = "/v1/enrich/all";
export const WEBHOOK_PATH = "/v1/enrich/webhook";

export interface Envelope {
  error?: boolean;
  success?: boolean;
  reason?: string;
  request_id?: string;
  credits_left?: number;
  data?: unknown;
  [key: string]: unknown;
}

export interface ApiResult {
  status: number;
  body: Envelope;
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

export function formatError(status: number, method: string, path: string, reason: string): string {
  const hint = status === 401
    ? " — the access token was rejected; check it was copied exactly"
    : status === 403
    ? " — the token has exceeded its quota"
    : status === 429
    ? " — rate limit (60 requests per second) exceeded"
    : status === 400
    ? " — the request is invalid"
    : "";
  return truncate(`Dropcontact ${status} for ${method} ${path}: ${reason}${hint}`, 1000);
}

/** Parse a response body into the envelope; non-JSON becomes `{ reason: <text> }`. */
export function parseEnvelope(text: string): Envelope {
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Envelope;
    return { data: parsed };
  } catch {
    return { reason: truncate(text.trim(), 300) };
  }
}

/** True for the documented "still processing" answer (HTTP 200, `error: false`, `success: false`). */
export function isNotReady(body: Envelope): boolean {
  return body.error !== true && body.success === false;
}

export class DropcontactClient {
  constructor(private ctx: HookContext) {}

  /** Returns the envelope for 2xx. Any other status, or `error: true`, throws with the vendor's reason. */
  async request(
    method: string,
    path: string,
    options: { body?: unknown; query?: Record<string, string | boolean | undefined> } = {},
  ): Promise<ApiResult> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    // No credential here: the Auth `sign` hook adds X-Access-Token.
    const res = await this.ctx.fetch(url.toString(), init);
    const body = parseEnvelope(await res.text().catch(() => ""));
    if (!res.ok || body.error === true) {
      throw new Error(
        formatError(res.status, method, url.pathname, body.reason ?? `HTTP ${res.status}`),
      );
    }
    return { status: res.status, body };
  }
}

/** Drop `undefined`/`null`/empty-string members. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
