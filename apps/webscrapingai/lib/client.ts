import type { HookContext } from "@w6w/types";

/**
 * WebScraping.AI REST API — verified 2026-10-06 against the vendor's published OpenAPI 3.1 document
 * (`https://webscraping.ai/openapi.json`, v3.2.2) and live probes of `api.webscraping.ai`.
 *
 * - Base `https://api.webscraping.ai`, no version prefix. Every operation is a `GET`.
 * - The key is the `api_key` QUERY parameter (`securitySchemes.api_key`), added by the Auth `sign`
 *   hook — never here.
 * - Success bodies are NOT uniformly JSON: `/ai/question`, `/html`, `/selected` and `/text` answer
 *   plain text or HTML; `/ai/fields`, `/selected-multiple`, `/serp`, `/data` and `/account` answer
 *   JSON. Failures are always JSON `{ message, … }` (scraping endpoints add `error_code`,
 *   `status_code`, `body`, `request_parameters`, `next_step`).
 * - Compound inputs ride the query string: `headers[Name]=v` and `fields[name]=desc` are deepObject
 *   form, `selectors=a&selectors=b` repeats the key (bracketed `selectors[]` silently returns empty).
 */
export const API_HOST = "api.webscraping.ai";
export const API_BASE = `https://${API_HOST}`;

export type Scalar = string | number | boolean | undefined | null;
export type QueryValue = Scalar | Scalar[] | Record<string, Scalar>;

export interface WsaiError {
  message?: string;
  error_code?: string;
  status_code?: number;
  status_message?: string;
  body?: string;
  next_step?: { message?: string };
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

/** Drop `undefined`/`null`/empty-string members so the wire carries only what was set. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export function requireText(value: unknown, label: string): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`${label} is required`);
  return s;
}

/** Accepts an array or a newline-separated string; returns trimmed non-empty items. */
export function toList(v: string[] | string | undefined): string[] {
  const items = Array.isArray(v) ? v : String(v ?? "").split("\n");
  return items.map((s) => String(s).trim()).filter(Boolean);
}

/** Accepts an object or a JSON-encoded object string; anything else is an error. */
export function toMap(v: unknown, label: string): Record<string, string> | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  let obj: unknown = v;
  if (typeof v === "string") {
    try {
      obj = JSON.parse(v);
    } catch {
      throw new Error(`${label} must be a JSON object`);
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error(`${label} must be a JSON object`);
  }
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(obj)) out[k] = String(val);
  return Object.keys(out).length ? out : undefined;
}

export function errorText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const e = JSON.parse(trimmed) as WsaiError;
    if (e && typeof e === "object" && typeof e.message === "string") {
      const parts = [e.error_code ? `${e.error_code}: ${e.message}` : e.message];
      if (e.status_code) parts.push(`(target HTTP ${e.status_code})`);
      return parts.join(" ");
    }
  } catch { /* not JSON */ }
  if (/^\s*<(!doctype|html)/i.test(trimmed)) {
    return /<title>([^<]*)<\/title>/i.exec(trimmed)?.[1] ?? "HTML error page";
  }
  return trimmed;
}

export function formatError(status: number, path: string, raw: string): string {
  const hint = status === 403
    ? " — the API key was rejected or never reached the request; reconnect this connection"
    : status === 402
    ? " — out of API credits; top up or wait for the plan to reset"
    : status === 429
    ? " — too many concurrent requests for the plan; retry when one finishes"
    : status === 504
    ? " — timed out; raise Timeout"
    : "";
  return truncate(`WebScraping.AI ${status} for GET ${path}: ${errorText(raw)}${hint}`, 1000);
}

function appendQuery(url: URL, query: Record<string, QueryValue>): void {
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item !== undefined && item !== null && item !== "") {
          url.searchParams.append(k, String(item));
        }
      }
    } else if (typeof v === "object") {
      for (const [sub, val] of Object.entries(v)) {
        if (val !== undefined && val !== null) url.searchParams.append(`${k}[${sub}]`, String(val));
      }
    } else {
      url.searchParams.append(k, String(v));
    }
  }
}

export interface RawResponse {
  text: string;
  contentType: string;
  requestId?: string;
}

export class WsaiClient {
  constructor(private ctx: HookContext) {}

  /** GET `path`; returns the body verbatim. Any non-2xx is thrown with the vendor's message. */
  async raw(path: string, query: Record<string, QueryValue> = {}): Promise<RawResponse> {
    const url = new URL(`${API_BASE}${path}`);
    appendQuery(url, query);
    // No key here: the Auth `sign` hook adds `api_key` to every request.
    const res = await this.ctx.fetch(url.toString(), {
      method: "GET",
      headers: { accept: "*/*" },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(formatError(res.status, path, text));
    return {
      text,
      contentType: res.headers.get("content-type") ?? "",
      requestId: res.headers.get("wsai-request-id") ?? undefined,
    };
  }

  /** GET `path` and parse the JSON body. */
  async json<T = Record<string, unknown>>(
    path: string,
    query: Record<string, QueryValue> = {},
  ): Promise<T> {
    const { text } = await this.raw(path, query);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`WebScraping.AI ${path}: expected JSON, got ${truncate(text, 200)}`);
    }
  }
}
