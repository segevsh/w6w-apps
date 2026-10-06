import type { HookContext } from "@w6w/types";

/**
 * thanks.io v2 REST client.
 *
 * Verified against https://docs.thanks.io/api-reference/openapi.json (OpenAPI 3.1, `servers`:
 * `https://api.thanks.io/api/v2`, security: bearer token) and live probes on 2026-10-06. The
 * v1 Postman collection is deprecated and is not used.
 *
 * Credentials are never added here: the Auth `sign` hook stamps `Authorization: Bearer`.
 */
export const API_BASE = "https://api.thanks.io";
export const API_PREFIX = "/api/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/**
 * The vendor's error bodies are not one shape. Measured/documented:
 *  - `{"message":"Unauthenticated."}`             (live 401, bad or missing token)
 *  - `{"message":"Mailing List Does Not Exist"}`  (documented 400/404)
 *  - `{"status":"Order #1 is still being fulfilled…","message":"…"}` (replay 400)
 *  - `{"message":"…","errors":{"field":["…"]}}`    (Laravel validation 422)
 */
export function errorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as { message?: unknown; status?: unknown; errors?: unknown };
  const parts: string[] = [];
  if (typeof b.message === "string") parts.push(b.message);
  if (typeof b.status === "string" && b.status !== b.message) parts.push(b.status);
  if (b.errors && typeof b.errors === "object") {
    const flat = Array.isArray(b.errors) ? b.errors : Object.entries(b.errors).map(
      ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : String(v)}`,
    );
    if (flat.length) parts.push(flat.map(String).join("; "));
  }
  return parts.length ? parts.join(" — ") : undefined;
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

export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/** Comma-separated string, array or single number -> list of trimmed non-empty strings. */
export function toList(v: unknown): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(",")).map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Comma-separated ids -> integer list (the API wants integers in `mailing_list_ids`). */
export function toIntList(v: unknown, label: string): number[] | undefined {
  const list = toList(v);
  if (!list) return undefined;
  return list.map((s) => {
    const n = Number(s);
    if (!Number.isInteger(n)) throw new Error(`${label} must be integers, got "${s}"`);
    return n;
  });
}

export function encodeId(id: unknown): string {
  return encodeURIComponent(String(id ?? "").trim());
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

export class ThanksioClient {
  constructor(private readonly ctx: HookContext) {}

  /** Perform a call and return the parsed JSON body. Throws on any non-2xx. */
  async call<T = Record<string, unknown>>(path: string, opts: RequestOptions = {}): Promise<T> {
    const method = opts.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const url = `${API_BASE}${API_PREFIX}${path}${buildQuery(opts.query)}`;
    const res = await this.ctx.fetch(url, { method, headers, body });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    if (!res.ok) {
      const detail = errorMessage(parsed) ?? text.slice(0, 300);
      throw new Error(`thanks.io ${method} ${path} failed (HTTP ${res.status}) ${detail}`.trim());
    }
    if (parsed === null || typeof parsed !== "object") {
      throw new Error(`thanks.io ${method} ${path} returned a non-JSON body (HTTP ${res.status})`);
    }
    return parsed as T;
  }
}
