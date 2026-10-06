import type { HookContext } from "@w6w/types";

/**
 * CleverReach REST API v3 client.
 *
 * Verified 2026-10-06 against the Swagger 2.0 document at
 * `https://rest.cleverreach.com/v3/explorer/swagger.json` (154 KB, 14 deprecated operations
 * excluded here) and live unauthenticated probes of `rest.cleverreach.com`.
 *
 * ## One host, two roots
 *
 *  - API: `https://rest.cleverreach.com/v3/…`, `Authorization: Bearer <token>`.
 *  - Token: `https://rest.cleverreach.com/oauth/token.php` (NOT under `/v3`).
 *
 * ## Errors have two shapes
 *
 *  - API: `{"error":{"code":401,"message":"Unauthorized"}}`.
 *  - Token endpoint: `{"error":"invalid_client","error_description":"…"}`.
 *
 * Both are classified from the BODY; the HTTP status is only a hint.
 *
 * ## The response schemas are not documented
 *
 * The Swagger document types nearly every 200 as a bare `string`/`array<string>`, so this
 * client returns what the vendor sent, parsed, and never reshapes it.
 */

export const API_HOST = "rest.cleverreach.com";
export const API_BASE = `https://${API_HOST}/v3`;
export const TOKEN_URL = `https://${API_HOST}/oauth/token.php`;
/** The credential probe path: `GET /v3/debug/ttl`. See `probeToken` in `auth/access-token.ts`. */
export const PROBE_PATH = "/debug/ttl";

export type QueryValue = string | number | boolean | undefined | null;

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** A path segment the caller must supply: trimmed, required, URL-encoded (ids may be emails). */
export function pathId(value: unknown, field: string): string {
  const id = String(value ?? "").trim();
  if (!id) throw new Error(`\`${field}\` is required`);
  return encodeURIComponent(id);
}

/** An optional string param. */
export function optString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === "" ? undefined : s;
}

/** An optional integer param, range-checked. */
export function optInt(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`\`${field}\` must be an integer from ${min} to ${max}`);
  }
  return n;
}

/** An optional value restricted to a known list. */
export function optEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T | undefined {
  const s = optString(value);
  if (s === undefined) return undefined;
  if (!(allowed as readonly string[]).includes(s)) {
    throw new Error(`\`${field}\` must be one of ${allowed.join(", ")} — got ${JSON.stringify(s)}`);
  }
  return s as T;
}

/** A list given as an array or a comma/newline separated string. */
export function list(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Accept a `json` param as a parsed value or the string a user typed. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/** A JSON param that must be a plain object. */
export function jsonObject(value: unknown, field: string): Record<string, unknown> | undefined {
  const parsed = json(value, field);
  if (parsed === undefined) return undefined;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`\`${field}\` must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * A point in time as CleverReach wants it: a Unix timestamp in seconds. Accepts a number, a
 * numeric string (taken as seconds) or an ISO 8601 date-time.
 */
export function unixTime(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || String(value).trim() === "") return undefined;
  const raw = String(value).trim();
  if (/^\d+$/.test(raw)) return Number(raw);
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) {
    throw new Error(`\`${field}\` must be a Unix timestamp or an ISO 8601 date-time`);
  }
  return Math.floor(ms / 1000);
}

/** Normalise a list-ish response: arrays pass through, anything else is kept as `raw`. */
export function asList(body: unknown): { items: unknown[]; count: number; raw?: unknown } {
  if (Array.isArray(body)) return { items: body, count: body.length };
  return { items: [], count: 0, raw: body };
}

/** The error text out of either of CleverReach's error shapes, if the body is one. */
export function errorOf(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const e = (payload as { error?: unknown; error_description?: unknown }).error;
  if (typeof e === "string") {
    const d = (payload as { error_description?: unknown }).error_description;
    return typeof d === "string" && d ? `${e}: ${d}` : e;
  }
  if (e && typeof e === "object") {
    const { code, message } = e as { code?: unknown; message?: unknown };
    const text = typeof message === "string" ? message : "error";
    return code !== undefined ? `${text} (code ${String(code)})` : text;
  }
  return undefined;
}

/** Turn a failed response into a message that says which failure mode it was. */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    detail = errorOf(JSON.parse(text)) ?? detail;
  } catch { /* empty or not JSON */ }

  if (status === 401) {
    return `${detail || "unauthorized"} — the bearer token was missing, invalid, expired or ` +
      "revoked. Tokens are tied to one CleverReach account; regenerate it under Account → " +
      "Extras → REST API";
  }
  if (status === 404) return `${detail || "not found"} — wrong id, or an id from another account`;
  if (status === 429) return `${detail || "too many requests"} — back off and retry`;
  return detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export class CleverReachClient {
  constructor(private ctx: HookContext) {}

  /** Returns the parsed body, or `null` for an empty one. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.append(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    let payload: unknown = null;
    let parsed = false;
    if (text.trim()) {
      try {
        payload = JSON.parse(text);
        parsed = true;
      } catch { /* handled below */ }
    }

    // The vendor's own error body decides, even on a 200; the status is only a hint.
    const err = parsed ? errorOf(payload) : undefined;
    if (err !== undefined || !res.ok) {
      throw new Error(`CleverReach ${res.status}: ${describeError(res.status, text)}`);
    }
    if (!text.trim()) return null as T;
    if (!parsed) throw new Error(`CleverReach returned a non-JSON body: ${text.slice(0, 160)}`);
    return payload as T;
  }
}
