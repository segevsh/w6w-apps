import type { HookContext } from "@w6w/types";

/** The one production host. The spec's `servers` block lists only this. */
export const API_BASE = "https://api.certifier.io";

/** Every path is under `/v1`. */
export const API_PREFIX = "/v1";

/**
 * The only API version that exists (changelog: one row, `2022-10-26`). The
 * header is REQUIRED on every request. Held here so `sign`, `test` and the
 * health probe all send the same value.
 */
export const API_VERSION = "2022-10-26";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Certifier's cursor envelope on every list endpoint. */
export interface CertifierPage<T> {
  data: T[];
  pagination?: { prev?: string | null; next?: string | null };
}

export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export function encodeId(id: string): string {
  const v = String(id ?? "").trim();
  if (!v) throw new Error("id is required");
  return encodeURIComponent(v);
}

/** Parse a JSON-object param that may arrive as an object or a JSON string. */
export function asObject(value: unknown, label: string): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`${label} is not valid JSON`);
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/** `["a","b"]` or `"a, b"` -> `["a","b"]`. */
export function toList(v: string[] | string | undefined | null): string[] {
  if (v === undefined || v === null || v === "") return [];
  return (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
}

export function truncate(text: string, max = 400): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes)`;
}

/**
 * Render a failed response. Certifier's error body is
 * `{"error": {"code", "message"}}`; the gateway's own 401 is the same shape
 * with the message `Unauthorized`. A 429 carries `Retry-After` (seconds).
 */
export function formatError(
  status: number,
  method: string,
  path: string,
  detail: string,
  retryAfter?: string | null,
): string {
  let code: string | undefined;
  let message: string | undefined;
  try {
    const body = JSON.parse(detail) as { error?: { code?: string; message?: string } };
    code = body?.error?.code;
    message = body?.error?.message;
  } catch {
    // not JSON — fall through to the raw text
  }
  const head = `Certifier ${method} ${path} failed: HTTP ${status}${code ? ` ${code}` : ""}`;
  const retry = status === 429 && retryAfter ? ` (retry after ${retryAfter}s)` : "";
  return `${head}${retry}${
    message ? ` — ${truncate(message)}` : detail && !code ? ` — ${truncate(detail)}` : ""
  }`;
}

/** Thin wrapper over `ctx.fetch`. Credentials and the version header come from `sign`. */
export class CertifierClient {
  constructor(private ctx: HookContext) {}

  /** JSON in, JSON out. 204 resolves to `{ deleted: true }`-style callers' own value. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatError(res.status, method, url.pathname, detail, res.headers.get("retry-after")),
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}
