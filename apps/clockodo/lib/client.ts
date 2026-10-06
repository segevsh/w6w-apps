import type { HookContext } from "@w6w/types";

/** Every endpoint is `https://my.clockodo.com/api/<path>`; the version is part of the path. */
export const API_URL = "https://my.clockodo.com/api";

/**
 * Clockodo has two error envelopes: `{ errors: [{ type, message, details, path }] }` (what the
 * live API returns, e.g. for a 401) and the OpenAPI document's `{ error: ... }` (SimpleErrors).
 */
export interface ClockodoBody {
  errors?: Array<{ type?: string; message?: string; details?: unknown; path?: unknown }>;
  error?: unknown;
  [key: string]: unknown;
}

/** The vendor's own message(s), whichever envelope carried them. */
export function messageOf(body: ClockodoBody | null): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const msgs = body.errors.map((e) => {
      const m = e?.message ?? e?.type;
      const where = typeof e?.path === "string" && e.path ? ` (${e.path})` : "";
      return m ? `${m}${where}` : undefined;
    }).filter(Boolean);
    if (msgs.length > 0) return msgs.join("; ");
  }
  const e = body.error;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") return m;
    return JSON.stringify(e).slice(0, 200);
  }
  return undefined;
}

export type Query = Record<string, unknown>;

/**
 * Serialise a query the way the reference declares it: scalars as `k=v`, objects as the
 * `deepObject` form `k[sub]=v`. `undefined`, `null` and empty strings are dropped.
 */
export function buildQuery(query: Query = {}): string {
  const qs = new URLSearchParams();
  const put = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    if (typeof value === "object" && !Array.isArray(value)) {
      for (const [k, v] of Object.entries(value)) put(`${key}[${k}]`, v);
    } else if (Array.isArray(value)) {
      for (const v of value) put(`${key}[]`, v);
    } else {
      qs.append(key, String(value));
    }
  };
  for (const [k, v] of Object.entries(query)) put(k, v);
  return qs.toString();
}

export interface CallOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
}

export class ClockodoClient {
  constructor(private ctx: HookContext) {}

  async call<T = ClockodoBody>(path: string, options: CallOptions = {}): Promise<T> {
    const method = options.method ?? (options.body === undefined ? "GET" : "POST");
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const q = buildQuery(options.query);
    const url = `${API_URL}${path}${q ? `?${q}` : ""}`;

    const res = await this.ctx.fetch(url, init);
    const raw = await res.text().catch(() => "");
    let body: ClockodoBody | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: reported below */ }

    if (!res.ok || body === null || typeof body !== "object") {
      const detail = messageOf(body) ?? (raw.slice(0, 200) || `HTTP ${res.status}`);
      throw new Error(`Clockodo ${res.status} for ${method} ${path}: ${detail}`);
    }
    return body as T;
  }
}

/** Drop keys whose value is `undefined` or an empty string (null is kept: it clears a field). */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** A positive integer id from a number or numeric string; throws otherwise (never reaches the API). */
export function intId(value: unknown, what: string): number {
  const s = String(value ?? "").trim();
  if (!/^\d+$/.test(s) || Number(s) <= 0) throw new Error(`${what} must be a positive integer id`);
  return Number(s);
}

/** An optional integer: `undefined`/empty stays `undefined`. */
export function optInt(value: unknown, what: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return intId(value, what);
}

/** Required non-empty string. */
export function reqString(value: unknown, what: string): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) throw new Error(`${what} is required`);
  return s;
}

/** Accept a JSON value, or a string holding JSON, for a `json` param. */
export function parseJson(value: unknown, what: string): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${what} is not valid JSON`);
  }
}

/** Paging params shared by every list endpoint. */
export const PAGING_PARAMS = [
  {
    key: "page",
    label: "Page",
    type: "number" as const,
    hint: "1-based page number.",
  },
  {
    key: "itemsPerPage",
    label: "Items per page",
    type: "number" as const,
    hint: "Page size; the customer list allows up to 5000.",
  },
];

export const PAGING_OUTPUT = {
  key: "paging",
  type: "object" as const,
  label: "{ items_per_page, current_page, count_pages, count_items }",
};

export function pagingQuery(input: { page?: unknown; itemsPerPage?: unknown }): Query {
  return {
    page: optInt(input.page, "page"),
    items_per_page: optInt(input.itemsPerPage, "itemsPerPage"),
  };
}

/** The `data` member of an envelope (object or array), or null. */
export function dataOf(body: ClockodoBody): unknown {
  return body.data ?? null;
}

export const BILLABLE_OPTIONS = [
  { value: "0", label: "Not billable" },
  { value: "1", label: "Billable" },
];
