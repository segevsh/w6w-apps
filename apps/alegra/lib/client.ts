import type { HookContext } from "@w6w/types";

/** The API host and version prefix. Verified against the OpenAPI `servers` block (2026-10-06). */
export const API_BASE = "https://api.alegra.com";
export const V1 = "/api/v1";

/** Alegra rejects a list `limit` above 30 with an error, and 30 is also the default. */
export const MAX_LIMIT = 30;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/**
 * The two error envelopes Alegra answers with. The application layer sends
 * `{ "error": "...", "code": 400 }` (and, for some deletes/voids, `{ "code", "message" }`),
 * while the AWS API gateway in front of it answers a missing or rejected credential
 * with the bare `{ "message": "Unauthorized" }` — no `code`, no `error`.
 */
export interface AlegraErrorBody {
  error?: string;
  message?: string;
  code?: number | string;
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** The vendor's own wording from an error body, or undefined when it is not an Alegra envelope. */
export function errorText(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const b = body as AlegraErrorBody;
  const text = typeof b.error === "string"
    ? b.error
    : typeof b.message === "string"
    ? b.message
    : undefined;
  if (text === undefined) return undefined;
  return b.code !== undefined ? `${text} (code ${b.code})` : text;
}

export function formatAlegraError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch { /* not JSON — fall through to the raw body */ }
  const text = errorText(parsed);
  return truncate(`Alegra ${status} for ${method} ${path}: ${text ?? raw}`, 1000);
}

/** Drop `undefined`, `null` and empty-string values so optional inputs are not sent. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** `{ id }` reference object, or undefined when no id was given. */
export function ref(id: unknown): { id: string } | undefined {
  if (id === undefined || id === null || id === "") return undefined;
  return { id: String(id) };
}

/** Path segment for a resource id. Ids are STRINGS (numeric-looking or UUID since 2025-01). */
export function idPath(id: unknown, name = "id"): string {
  if (id === undefined || id === null || String(id).trim() === "") {
    throw new Error(`${name} is required`);
  }
  return encodeURIComponent(String(id).trim());
}

function parseJson(value: unknown, name: string): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

/** A free-form JSON object input (accepts an object or its JSON text). */
export function jsonObject(value: unknown, name: string): Record<string, unknown> {
  if (value === undefined || value === null || value === "") return {};
  const parsed = parseJson(value, name);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${name} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/** A free-form JSON array input; undefined when absent. */
export function jsonArray(value: unknown, name: string): unknown[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = parseJson(value, name);
  if (!Array.isArray(parsed)) throw new Error(`${name} must be a JSON array`);
  return parsed;
}

/** Comma-separated text (or an array) to a trimmed, non-empty string list. */
export function stringList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return raw.map((v) => String(v).trim()).filter((v) => v.length > 0);
}

/** Validate a list `limit` locally: Alegra errors above 30 rather than clamping. */
export function listLimit(limit: unknown): number | undefined {
  if (limit === undefined || limit === null || limit === "") return undefined;
  const n = Number(limit);
  if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return n;
}

export interface ListResult {
  items: unknown[];
  total: number | null;
}

/**
 * Normalise a list response. A plain list answers a bare array; with `metadata=true` it answers
 * `{ metadata: { total }, data: [...] }`. Both become `{ items, total }`.
 */
export function toList(body: unknown): ListResult {
  if (Array.isArray(body)) return { items: body, total: null };
  if (body && typeof body === "object") {
    const b = body as { data?: unknown; metadata?: { total?: unknown } };
    if (Array.isArray(b.data)) {
      const total = Number(b.metadata?.total);
      return { items: b.data, total: Number.isFinite(total) ? total : null };
    }
  }
  throw new Error("Alegra list response was neither an array nor a { data } envelope");
}

export class AlegraClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${V1}${path}`);
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
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatAlegraError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    const text = await res.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  /** GET a collection with Alegra's `start`/`limit`/`metadata` paging, normalised. */
  async list(
    path: string,
    query: Record<string, QueryValue>,
  ): Promise<ListResult> {
    return toList(
      await this.request(path, { query: { ...query, metadata: true } }),
    );
  }
}
