import type { HookContext } from "@w6w/types";

/**
 * Recruiterflow external API client.
 *
 * Verified 2026-10-06 against Recruiterflow's own OpenAPI 3.0 document
 * (`https://recruiterflow.com/swagger.yml` — the file is JSON despite the name, 128 paths) and
 * live probes against `api.recruiterflow.com`.
 *
 * The document has no `servers` entry; the host comes from `info.description` ("Domain for all API
 * requests should be api.recruiterflow.com") and every path lives under `/api/external`.
 *
 * ## Response shapes
 *
 * There is no envelope. Lists answer a bare array, or `{"data": [...], "total_items": n}` when
 * `include_count` is on; writes answer `{"RESULT": "..."}` (plus `data: {id}` on creates);
 * `/info` answers `{"data": {"display_name"}}`. {@link asList} and {@link asObject} normalise that.
 *
 * ## Errors
 *
 * A missing key answers **400** `{"message":"Please supply an API key"}` and a wrong one **401**
 * `{"message":"Invalid API key"}`. The status alone is not trusted; see `auth/api-key.ts`.
 */
export const API_BASE = "https://api.recruiterflow.com";
export const API_PREFIX = "/api/external";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export function errorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as { message?: unknown; error?: unknown; RESULT?: unknown };
  for (const v of [b.message, b.error]) if (typeof v === "string" && v) return v;
  return undefined;
}

export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Accept a JSON string or an already-parsed value; undefined/blank stays undefined. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** An integer param (ids). Undefined/blank stays undefined; anything else must be an integer. */
export function toInt(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error(`${label} must be an integer, got "${value}"`);
  return n;
}

export function buildQuery(query: Record<string, QueryValue> | undefined): string {
  if (!query) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/** Call the API. Credentials are NOT set here: the runtime routes the request through `sign`. */
export async function call(
  ctx: HookContext,
  path: string,
  opts: RequestOptions = {},
): Promise<unknown> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = { accept: "application/json" };
  const init: RequestInit = { method, headers };
  if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${path}${buildQuery(opts.query)}`, init);
  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
  }
  if (!res.ok) {
    const msg = errorMessage(parsed) ?? (text ? text.slice(0, 200) : res.statusText);
    throw new Error(`Recruiterflow ${method} ${path} failed (HTTP ${res.status}): ${msg}`);
  }
  return parsed ?? {};
}

/** Lists: a bare array, or `{data: [...], total_items}` when `include_count` is on. */
export function asList(
  body: unknown,
): { items: unknown[]; total?: number; raw?: unknown } {
  if (Array.isArray(body)) return { items: body };
  const b = (body ?? {}) as { data?: unknown; total_items?: unknown; total_deals?: unknown };
  const total = typeof b.total_items === "number"
    ? b.total_items
    : typeof b.total_deals === "number"
    ? b.total_deals
    : undefined;
  if (Array.isArray(b.data)) {
    return total === undefined ? { items: b.data } : { items: b.data, total };
  }
  // An undocumented shape is handed back whole rather than silently reported as empty.
  return { items: [], raw: body };
}

/** Single records and write results: an object passes through, anything else is wrapped. */
export function asObject(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : { result: body };
}

/** A checkbox param -> the `1` the API documents for booleans ("1 -> True"); false/blank is omitted. */
export function flag(value: unknown): number | undefined {
  return value === true || value === 1 || value === "1" || value === "true" ? 1 : undefined;
}

/** `{id}` and/or `{name}` destination stage object for move-to-stage; undefined if neither. */
export function stageOf(
  stage: { id?: number; name?: unknown },
): Record<string, unknown> | undefined {
  const out = compact(stage);
  return Object.keys(out).length ? out : undefined;
}
