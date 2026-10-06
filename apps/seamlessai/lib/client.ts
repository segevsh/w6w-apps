import type { HookContext } from "@w6w/types";

/**
 * Seamless.AI public API, v2 — `https://api.seamless.ai/api/client/v2`.
 *
 * v1 (`/api/client/v1`) is still served and covers only search, research and
 * the two org-data lists; v2 is a strict superset (the same nine operations
 * plus lists, saved searches, campaigns, tasks, templates, calls, activity and
 * credits), so this app speaks v2 only and never needs a second base URL.
 */
export const API_BASE = "https://api.seamless.ai";
export const API_PREFIX = "/api/client/v2";
export const API_URL = `${API_BASE}${API_PREFIX}`;

type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  query?: Record<string, Scalar>;
  body?: unknown;
}

/**
 * A failed call, classified from the response BODY.
 *
 * Seamless documents `{message}` for 401/500 and `{msg, code, data}` for 422,
 * but the wire disagrees with its own spec: a bad key answers
 * `401 {"msg":"Invalid token"}` and a missing one `401 {"msg":"Unauthorized"}`
 * (measured 2026-10-06), so both spellings are read. The vendor's own `code`
 * (`rateLimitExceeded`, `insufficientCredits`, a missing-licence code) is what
 * a caller should branch on, not the status.
 */
export class SeamlessError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    /** Epoch seconds from `X-RateLimit-Reset`, present on a 429. */
    readonly resetAt?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "SeamlessError";
  }
}

/** Pull the vendor's message and code out of either documented error shape. */
export function describeError(body: unknown): { message?: string; code?: string } {
  if (!body || typeof body !== "object") {
    return { message: typeof body === "string" && body ? body.slice(0, 200) : undefined };
  }
  const b = body as Record<string, unknown>;
  const message = typeof b.msg === "string"
    ? b.msg
    : typeof b.message === "string"
    ? b.message
    : undefined;
  const code = typeof b.code === "string" ? b.code : undefined;
  return { message, code };
}

/** Drop `undefined`/`null`/empty-string keys so optional inputs never reach the wire. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Accept a list however a form or an upstream step hands it over: a real array,
 * a JSON-array string, or comma / newline separated text. Returns `undefined`
 * (not `[]`) for nothing, so `compact` drops the key.
 */
export function toList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    const items = value.map((v) => String(v).trim()).filter((v) => v !== "");
    return items.length ? items : undefined;
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (text.startsWith("[")) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return toList(parsed);
      } catch { /* fall through to splitting */ }
    }
    const items = text.split(/[\n,]/).map((v) => v.trim()).filter((v) => v !== "");
    return items.length ? items : undefined;
  }
  return [String(value)];
}

/** A list of integer ids (the vendor's `contactIds`, `listIds`, … are integers). */
export function toIdList(value: unknown): number[] | undefined {
  const items = toList(value);
  if (!items) return undefined;
  return items.map((v) => {
    const n = Number(v);
    if (!Number.isInteger(n)) throw new Error(`"${v}" is not an integer id`);
    return n;
  });
}

/** An object that arrives either parsed or as a JSON string. */
export function toObject(value: unknown, label: string): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`${label} must be valid JSON`);
    }
    return toObject(parsed, label);
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

/** An array of objects that arrives either parsed or as a JSON string. */
export function toObjectList(value: unknown, label: string): Record<string, unknown>[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") {
    try {
      return toObjectList(JSON.parse(value), label);
    } catch (e) {
      if (e instanceof SyntaxError) throw new Error(`${label} must be valid JSON`);
      throw e;
    }
  }
  if (!Array.isArray(value) || value.some((v) => !v || typeof v !== "object")) {
    throw new Error(`${label} must be a JSON array of objects`);
  }
  return value as Record<string, unknown>[];
}

/** A required path segment, URL-encoded; refuses blanks rather than hitting `/lists/`. */
export function segment(value: unknown, label: string): string {
  const text = value === undefined || value === null ? "" : String(value).trim();
  if (!text) throw new Error(`${label} is required`);
  return encodeURIComponent(text);
}

export class SeamlessClient {
  constructor(private ctx: HookContext) {}

  async request<T = Record<string, unknown>>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
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
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!res.ok) {
      const { message, code } = describeError(parsed);
      const reset = Number(res.headers.get("x-ratelimit-reset"));
      const resetAt = res.status === 429 && Number.isFinite(reset) && reset > 0 ? reset : undefined;
      const detail = [code, message].filter(Boolean).join(": ") || res.statusText || "no detail";
      const wait = resetAt ? ` (rate limit resets at epoch ${resetAt})` : "";
      throw new SeamlessError(
        `Seamless.AI ${res.status} for ${method} ${url.pathname}: ${detail}${wait}`,
        res.status,
        code,
        resetAt,
        parsed,
      );
    }
    return (parsed ?? {}) as T;
  }
}

/** A required integer id the vendor types as `integer` (task `contactId`, …). */
export function toInt(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(n)) throw new Error(`${label} must be an integer`);
  return n;
}

/** Refuse a missing required field locally instead of spending a request (and a 4xx) on it. */
export function need<T>(value: T | undefined, label: string): T {
  if (value === undefined || value === null || (value as unknown) === "") {
    throw new Error(`${label} is required`);
  }
  return value;
}
