import type { HookContext } from "@w6w/types";

/**
 * Diffbot API. Verified 2026-10-06 against the vendor docs (docs.diffbot.com
 * redirects to the real pages at www.diffbot.com/docs/…) plus live unauthenticated
 * probes of every host below.
 *
 * ## Four hosts, two credential shapes
 *
 * - `api.diffbot.com` — Extract (`/v3/*`), Crawl (`/v3/crawl*`), Account (`/v4/account`)
 * - `kg.diffbot.com` — Knowledge Graph search (`/kg/v3/dql`) and Enhance (`/kg/v3/enhance`)
 * - `nl.diffbot.com` — Natural Language (`/v1/`)
 * - `llm.diffbot.com` — Web Search (`/api/v1/web_search`)
 *
 * The first three take the token as a `token` query parameter; Web Search takes it
 * as `Authorization: Bearer`. The Auth `sign` hook adds the right one per host, so
 * nothing in this file (or any action) sees the credential.
 *
 * ## Errors have no single shape
 *
 * Extract/Crawl/Account: `{"errorCode":404,"error":"Could not download page (404)"}`;
 * the gateway also adds `{"code","message","requestId"}`. DQL: `{"error":true,"message"}`
 * (parse errors add `line`/`column`). Web Search: `{"errors":["…"]}`. Natural Language:
 * `{"messages":["…"]}`. `error` is sometimes a string and sometimes the boolean `true`.
 * {@link errorText} reads all of them. A body carrying a numeric `errorCode` >= 400
 * is treated as a failure even when the HTTP status is 2xx.
 */
export const API_HOST = "api.diffbot.com";
export const KG_HOST = "kg.diffbot.com";
export const NL_HOST = "nl.diffbot.com";
export const LLM_HOST = "llm.diffbot.com";
export const HOSTS = [API_HOST, KG_HOST, NL_HOST, LLM_HOST] as const;

type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  host?: string;
  method?: string;
  query?: Record<string, Scalar | Scalar[]>;
  /** JSON body. */
  json?: unknown;
  /** `application/x-www-form-urlencoded` body (Crawl create does not accept JSON). */
  form?: Record<string, Scalar>;
  /** Raw body with its own content type (Extract POST of HTML / plain text). */
  raw?: { body: string; contentType: string };
}

export interface ApiResult {
  status: number;
  /** Parsed JSON, or the raw text for non-JSON bodies (CSV). `undefined` when empty. */
  body: unknown;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

/** The vendor's own message out of any of its error shapes, else the raw text. */
export function errorText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const p = JSON.parse(trimmed) as Record<string, unknown>;
    if (Array.isArray(p?.errors) && p.errors.length) return p.errors.map(String).join("; ");
    if (Array.isArray(p?.messages) && p.messages.length) return p.messages.map(String).join("; ");
    if (typeof p?.error === "string") return p.error;
    if (typeof p?.message === "string") return p.message;
  } catch { /* plain text */ }
  return trimmed;
}

/** `errorCode` (Extract/Crawl) or `code` (gateway) when the body carries one. */
function bodyCode(body: unknown): number | undefined {
  if (!body || typeof body !== "object") return undefined;
  const o = body as Record<string, unknown>;
  const c = o.errorCode ?? o.code;
  return typeof c === "number" ? c : undefined;
}

export function formatError(status: number, method: string, path: string, raw: string): string {
  const text = errorText(raw);
  const hint = status === 401
    ? " — the token was rejected or missing; check the connection's token"
    : status === 429
    ? " — rate limit hit (calls per second/minute by plan) or credits exhausted"
    : status === 402
    ? " — payment required: the account's credits are exhausted"
    : "";
  return truncate(`Diffbot ${status} for ${method} ${path}: ${text}${hint}`, 1000);
}

export class DiffbotClient {
  constructor(private ctx: HookContext) {}

  /** Returns the response for 2xx; every other status (or a 2xx error body) throws. */
  async request(path: string, options: RequestOptions = {}): Promise<ApiResult> {
    const url = new URL(`https://${options.host ?? API_HOST}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      for (const item of Array.isArray(v) ? v : [v]) {
        if (item === undefined || item === null || item === "") continue;
        url.searchParams.append(k, String(item));
      }
    }
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (options.json !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.json);
    } else if (options.form) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      const f = new URLSearchParams();
      for (const [k, v] of Object.entries(options.form)) {
        if (v === undefined || v === null || v === "") continue;
        f.set(k, String(v));
      }
      body = f.toString();
    } else if (options.raw) {
      headers["content-type"] = options.raw.contentType;
      body = options.raw.body;
    }
    const method = options.method ?? (body !== undefined ? "POST" : "GET");
    const init: RequestInit = { method, headers };
    if (body !== undefined) init.body = body;
    // No credential here: the Auth `sign` hook adds `token` or the bearer header.
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(formatError(res.status, method, url.pathname, text));
    if (!text) return { status: res.status, body: undefined };
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch { /* csv / text */ }
    const code = bodyCode(parsed);
    if (code !== undefined && code >= 400 && typeof parsed === "object") {
      throw new Error(formatError(code, method, url.pathname, text));
    }
    return { status: res.status, body: parsed };
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

/** A comma-separated string param → trimmed list without blanks. */
export function splitList(value: string | undefined): string[] {
  return (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}
