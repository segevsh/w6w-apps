import type { HookContext } from "@w6w/types";

/** Formbricks Cloud's v1 API root (the OpenAPI `servers[0]` host is `app.formbricks.com`). */
export const API_HOST = "app.formbricks.com";
export const API_URL = `https://${API_HOST}/api/v1`;

/** Percent-encode one path segment (every id in this API is a caller-supplied cuid string). */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/** Accept a list as a real array or as the comma-separated text a form field produces. */
export function strList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Accept a JSON value either parsed or as the JSON text a form field produces.
 * Anything unparseable passes through so the vendor, not this app, rejects it.
 */
export function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/** A JSON object to spread into a request body; anything else contributes nothing. */
export function objectValue(value: unknown): Record<string, unknown> {
  const v = jsonValue(value);
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
}

/** Drop `undefined` values so an unset form field is never sent. `null` is kept. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Build `?a=1&b=2`; unset, null and empty values are skipped. */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/** Formbricks' success envelope: `{ data }`. (`GET /management/me` is the exception: bare.) */
export interface FormbricksEnvelope<T = unknown> {
  data?: T;
  [key: string]: unknown;
}

/**
 * One human line from a failed response. Formbricks errors are
 * `{ code, message, details }`, where `details` maps a field (or the header) to why.
 */
export function errorText(parsed: unknown, raw: string): string {
  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    const message = typeof o.message === "string"
      ? o.message
      : typeof o.error === "string"
      ? o.error
      : "";
    const details = o.details && typeof o.details === "object" &&
        Object.keys(o.details).length > 0
      ? ` ${JSON.stringify(o.details).slice(0, 300)}`
      : "";
    const code = typeof o.code === "string" ? `${o.code}: ` : "";
    if (message) return `${code}${message}${details}`;
  }
  const text = raw.trim();
  return text.startsWith("<") ? "" : text.slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

/**
 * Thin client over `https://app.formbricks.com/api/v1`. Credentials are never handled
 * here: the runtime routes every `ctx.fetch` through the Auth `sign` hook, which stamps
 * the `x-api-key` header.
 */
export class FormbricksClient {
  constructor(private readonly ctx: HookContext) {}

  async request<T = FormbricksEnvelope>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${API_URL}${path}${buildQuery(options.query)}`;
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch { /* non-JSON body: reported below if the request failed */ }
    }

    if (!res.ok) {
      const detail = errorText(parsed, text);
      throw new Error(
        `Formbricks ${method} ${path} failed: HTTP ${res.status}${detail ? ` — ${detail}` : ""}${
          hint(res.status)
        }`,
      );
    }
    return (parsed ?? {}) as T;
  }
}

/** What each documented status means in this API, appended to a failure. */
function hint(status: number): string {
  switch (status) {
    case 401:
      return " (API key missing/invalid, or it has no access to this workspace)";
    case 403:
      return " (the API key's permission level does not allow this operation)";
    case 429:
      return " (rate limited: 100 requests/minute per API key)";
    default:
      return "";
  }
}
