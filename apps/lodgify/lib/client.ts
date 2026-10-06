import type { HookContext } from "@w6w/types";

/**
 * Lodgify Public API client.
 *
 * Everything here was verified on 2026-10-05 against the OpenAPI 3.0.3 document that
 * ReadMe embeds in every page of https://docs.lodgify.com/reference (append `.md` to a
 * page URL to get it), plus live probes of `api.lodgify.com`.
 *
 * ## One host, versioned paths
 *
 * The document declares one server, `https://api.lodgify.com`. v1 and v2 are both
 * served from it, distinguished by the first path segment (`/v1/...`, `/v2/...`), so
 * every action passes the full path including the version. v2 is used wherever it
 * covers the operation; v1 only where v2 has no equivalent (writes to bookings,
 * enquiries, availability and rates).
 *
 * ## Errors
 *
 * Per docs.lodgify.com/docs/errors a failed request answers 4xx/5xx with
 * `{message, code, correlation_id, event_id}`. {@link failureMessage} reads those.
 * Rate limits (docs/rate-limits): 600 requests/minute on v1, 750 on v2, answered with
 * 429; no rate-limit header is documented and none was seen live.
 */

export const API_BASE = "https://api.lodgify.com";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Extra query pairs appended verbatim (used for the indexed `roomTypes[0].Id` form). */
  rawQuery?: Array<[string, string]>;
  body?: unknown;
}

/** Lodgify's documented error object. */
export interface LodgifyErrorBody {
  message?: string;
  code?: number | string;
  correlation_id?: string;
  event_id?: string;
}

/** Drop keys the caller left unset; `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Path-escape a caller-supplied id. */
export function segment(value: unknown): string {
  return encodeURIComponent(String(value ?? "").trim());
}

export function asText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
}

export function asNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** A required id: throws a readable error when absent. */
export function requireNumber(value: unknown, label: string): number {
  const n = asNumber(value);
  if (n === undefined) throw new Error(`\`${label}\` is required`);
  return n;
}

export function requireText(value: unknown, label: string): string {
  const t = asText(value);
  if (t === undefined) throw new Error(`\`${label}\` is required`);
  return t;
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

export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/** Read `message` (and `code`) off Lodgify's documented error object. */
export function failureMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as LodgifyErrorBody;
  if (typeof b.message !== "string" || !b.message) return undefined;
  return b.code !== undefined ? `${b.message} (code ${b.code})` : b.message;
}

export class LodgifyClient {
  constructor(private ctx: HookContext) {}

  /**
   * One request. Returns the parsed JSON body, or `undefined` for an empty body (the
   * v1 status-transition PUTs answer 200 with no content). Throws on any non-2xx with
   * Lodgify's own message when the body carries one.
   */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T | undefined> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
    for (const [key, value] of options.rawQuery ?? []) url.searchParams.append(key, value);

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), { method, headers, body });
    const text = await res.text();
    let parsed: unknown;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }
    if (!res.ok) {
      const detail = failureMessage(parsed) ?? (text.trim().slice(0, 300) || res.statusText ||
        "no body");
      throw new Error(`Lodgify ${res.status} for ${method} ${url.pathname}: ${detail}`);
    }
    return parsed as T | undefined;
  }

  /** A request whose documented result is a bare array: wrapped as `{ items }`. */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<{ items: T[] }> {
    const body = await this.request<T[]>(path, options);
    return { items: Array.isArray(body) ? body : [] };
  }

  /** A request with no useful response body: returns `{ ok: true }` on success. */
  async command(path: string, options: RequestOptions = {}): Promise<Record<string, unknown>> {
    const body = await this.request(path, options);
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return { ok: true, ...(body as Record<string, unknown>) };
    }
    return { ok: true };
  }

  /** A request whose documented result is a bare integer id (v1 creates answer 201 `int`). */
  async created(path: string, options: RequestOptions = {}): Promise<{ id: number | null }> {
    const body = await this.request(path, options);
    return { id: typeof body === "number" ? body : null };
  }
}
