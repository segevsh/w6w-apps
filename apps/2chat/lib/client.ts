/**
 * Shared HTTP client for the **2Chat Open API**.
 *
 * ## Where the contract came from
 *
 * Every path, verb and field in this app was read on 2026-10-06 from 2Chat's own Docusaurus
 * reference (`https://developers.2chat.co/docs/API/...`, indexed by `https://developers.2chat.co/llms.txt`,
 * the one real machine-readable index — `llms-full.txt` is the site's 404 shell) and cross-read
 * against the vendor's own agent skills (`github.com/2ChatCo/agent-skills`). Where those two
 * disagree the app says so (README "Where the docs disagree").
 *
 * ## Base URL
 *
 * `https://api.p.2chat.io/open` — NOT on the docs site's TLD (`2chat.co`). The docs host is
 * `developers.2chat.co`, the product is `2chat.io`, and the API is `api.p.2chat.io`. Confirmed on
 * the wire: an unauthenticated call answers `403 {"detail":"Not authenticated"}` and a call with
 * a wrong key answers `401 {"detail":"Invalid API Key"}`.
 *
 * ## Auth
 *
 * `X-User-API-Key: <key>`. No header is set here — the auth `sign` hook is the only place in
 * this app that touches the credential.
 *
 * ## Two error envelopes
 *
 * The docs describe `{ "success": false, "error": true, "error_message": "..." }` (plus an
 * `error_code` on WABA). The API *gateway* in front of it does not use that shape: a missing or
 * bad key answers `{ "detail": "..." }` (FastAPI style, a string — or a list on validation
 * errors). `formatError` reads both. A `200` is also not proof of success: `success: false` and
 * `error: true` in a 2xx body are failures here.
 */
import type { HookContext } from "@w6w/types";

export const API_HOST = "api.p.2chat.io";
export const API_URL = `https://${API_HOST}/open`;

/** The documented error body, plus the gateway's `detail`. Everything is optional. */
export interface TwoChatBody {
  success?: boolean;
  error?: boolean;
  error_code?: string;
  error_message?: string;
  detail?: unknown;
  message?: string;
}

/** Render a vendor error for a human. Never echoes the request, query string or any header. */
export function formatError(status: number, body: TwoChatBody | undefined): string {
  if (!body || typeof body !== "object") return `HTTP ${status}`;
  let text = body.error_message ?? body.message;
  if (!text && typeof body.detail === "string") text = body.detail;
  if (!text && Array.isArray(body.detail)) {
    text = body.detail
      .map((
        d,
      ) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : ""))
      .filter(Boolean)
      .join("; ");
  }
  const code = body.error_code ? ` (${body.error_code})` : "";
  return text ? `HTTP ${status}${code}: ${text}` : `HTTP ${status}${code}`;
}

/** True when a parsed body says it failed, whatever the status code was. */
export function bodyFailed(body: TwoChatBody | undefined): boolean {
  return !!body && typeof body === "object" && (body.success === false || body.error === true);
}

/**
 * Encode one path segment. Phone numbers (`+595…`) and WhatsApp session keys
 * (`WW-WPN…@c.us`) appear literally in 2Chat's own examples, so `+` and `@` are left as they
 * are; everything else is percent-encoded so a uuid cannot smuggle a `/`.
 */
export function seg(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error("a required path value is empty");
  return encodeURIComponent(s).replace(/%2B/gi, "+").replace(/%40/g, "@");
}

/** Drop keys the caller left unset so an optional never overwrites a vendor default. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === "") continue;
    out[key as keyof T] = value as T[keyof T];
  }
  return out;
}

/** A JSON-typed param arrives as a string or an already-live value. */
export function parseJson(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/** A list param arrives as an array, or as a comma/newline-separated string. */
export function toList(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  const raw = Array.isArray(value) ? value : String(value).split(/[\n,]/);
  return raw.map((v) => String(v).trim()).filter((v) => v.length > 0);
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * Deliberately sets no auth header: the runtime routes every request through the auth `sign`
 * hook, and that hook is the only code in this app that sees the key.
 */
export class TwoChatClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();

    let parsed: TwoChatBody | undefined;
    if (text) {
      try {
        parsed = JSON.parse(text) as TwoChatBody;
      } catch {
        parsed = undefined;
      }
    }

    if (!res.ok || bodyFailed(parsed)) {
      throw new Error(
        `2Chat ${method} ${url.pathname} returned ${formatError(res.status, parsed)}`,
      );
    }

    if (!text) return undefined as T;
    return (parsed ?? { raw: text }) as T;
  }

  get<T = unknown>(path: string, query?: RequestOptions["query"]): Promise<T> {
    return this.request<T>(path, { query });
  }

  post<T = unknown>(path: string, body?: unknown, query?: RequestOptions["query"]): Promise<T> {
    return this.request<T>(path, { method: "POST", body: body ?? {}, query });
  }

  put<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "PUT", body });
  }

  delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }
}
