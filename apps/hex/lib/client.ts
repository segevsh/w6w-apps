import type { HookContext } from "@w6w/types";

/**
 * Hex API client. Every request goes through `ctx.fetch`; the bearer token is
 * stamped on by the auth `sign` hook, never here.
 *
 * Verified against Hex's OpenAPI 3.0.3 document (https://static.hex.site/openapi.json,
 * fetched 2026-10-06): `servers[0].url` is `https://app.hex.tech/api`, every path
 * starts `/v1/`, and the one security scheme is `http` / `bearer`.
 */
export const API_BASE = "https://app.hex.tech";
export const API_PREFIX = "/api/v1";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Cursor page: `values` plus `{ after, before }` cursors (null at the ends). */
export interface HexCursorPage<T> {
  values: T[];
  pagination?: { after?: string | null; before?: string | null };
}

export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** A JSON param arrives as an object, or as a string from a form field. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(Boolean);
  return items.length ? items : undefined;
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

interface HexErrorBody {
  // Newer endpoints: { code, message, issues }.
  code?: string;
  message?: string;
  issues?: Array<{ message?: string }>;
  // Older endpoints: { reason, details, traceId }.
  reason?: string;
  details?: string;
}

/**
 * Hex answers errors in THREE shapes: `{code,message,issues}` (newer endpoints),
 * `{reason,details,traceId}` (older ones), and — for a missing or bad token,
 * answered by the edge before any route runs — the bare text `Unauthorized`.
 */
export function parseErrorBody(raw: string): HexErrorBody | null {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as HexErrorBody : null;
  } catch {
    return null;
  }
}

export function formatHexError(
  status: number,
  method: string,
  path: string,
  raw: string,
  traceId?: string | null,
): string {
  const body = parseErrorBody(raw);
  const code = body?.code ?? body?.reason;
  const detail = body?.message ?? body?.details;
  const issues = (body?.issues ?? []).map((i) => i.message).filter(Boolean).join("; ");
  const parts = [
    `Hex ${status}${code ? ` ${code}` : ""} for ${method} ${path}`,
    body ? detail : truncate(raw),
    issues || undefined,
    status === 429 ? "rate limited; retry with backoff" : undefined,
    traceId ? `trace ${traceId}` : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class HexClient {
  constructor(private ctx: HookContext) {}

  /** Request and parse the JSON body; a 204 or empty body yields `undefined`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
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
      throw new Error(
        formatHexError(
          res.status,
          init.method ?? "GET",
          url.pathname,
          detail,
          res.headers.get("x-trace-id"),
        ),
      );
    }
    return res;
  }
}
