import type { HookContext } from "@w6w/types";

/**
 * Demio public API client (`my.demio.com/api/v1`).
 *
 * Every path, verb, parameter and header here was verified 2026-10-05 against the vendor's
 * Apiary blueprint (`jsapi.apiary.io/apis/publicdemioapi.apib`) plus live unauthenticated and
 * garbage-credential probes against `my.demio.com`.
 *
 * ## Auth: two headers, `Api-Key` and `Api-Secret`
 *
 * The blueprint documents two ways to send them: headers, or `?api_key=&api_secret=` on a
 * separate `/ping/query` route. Only the header form is used — a credential in a URL lands in
 * access logs. The headers are stamped by the Auth `sign` hook, never here.
 *
 * ## Errors
 *
 * Failures are `{"messages": ["..."]}` (a 401 `/ping` additionally carries `"pong": false`).
 * Messages are joined into one line for the thrown Error.
 *
 * ## No pagination
 *
 * The blueprint documents no paging parameter on any list endpoint; `GET /events` returns the
 * whole array, so none is offered.
 */
export const API_HOST = "my.demio.com";
export const API_BASE = `https://${API_HOST}/api/v1`;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Drop keys the caller left unset. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out = {} as Partial<T>;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Turn Demio's `{messages: [...]}` error body into one actionable line. */
export function formatDemioError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let messages: string[] = [];
  try {
    const parsed = JSON.parse(raw) as { messages?: unknown };
    if (Array.isArray(parsed.messages)) messages = parsed.messages.map(String);
  } catch {
    // not JSON — fall through to the raw body
  }
  if (messages.length === 0) return `Demio ${status} for ${method} ${path}: ${raw.slice(0, 500)}`;
  return `Demio ${status} for ${method} ${path}: ${messages.join("; ")}`;
}

export class DemioClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(formatDemioError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
