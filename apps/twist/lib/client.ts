import type { HookContext } from "@w6w/types";

/** Every Twist API call goes to this one host. */
export const API_BASE = "https://api.twist.com";

/** Wire value of a request parameter. Arrays and objects are JSON-encoded. */
export type WireValue =
  | string
  | number
  | boolean
  | unknown[]
  | Record<string, unknown>
  | null
  | undefined;

export interface CallOptions {
  /** `GET` sends `params` as a query string; `POST` sends them as a form body. */
  method?: "GET" | "POST";
  /** Path below `/api/v{version}`, e.g. `/channels/getone`. */
  path: string;
  /**
   * Most of the surface is `/api/v3`. Twist moved workspace users to `/api/v4` and deprecated
   * the v3 copies, so `workspace_users/*` is the only family that passes `4`.
   */
  version?: 3 | 4;
  params?: Record<string, WireValue>;
}

/**
 * Twist's error body, verified live on 2026-10-06 against `api.twist.com`:
 * `{"error_code":200,"error_string":"Invalid token","error_extra":{},"error_uuid":"…"}`.
 * The OAuth endpoints use a different shape, `{"error":"BAD_REQUEST","error_message":"…"}`.
 */
export interface TwistErrorBody {
  error_code?: number;
  error_string?: string;
  error_extra?: Record<string, unknown>;
  error?: string;
  error_message?: string;
}

/** Twist error codes that mean "this credential is not accepted" (not "you may not do that"). */
export const AUTH_ERROR_CODES = [120, 200];

export class TwistError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TwistError";
  }
}

/** A documented Twist error body: a numeric `error_code` plus a string. Nothing else qualifies. */
export function asTwistError(value: unknown): TwistErrorBody | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const v = value as TwistErrorBody;
  if (typeof v.error_code === "number" && typeof v.error_string === "string") return v;
  if (typeof v.error === "string" && typeof v.error_message === "string") return v;
  return undefined;
}

/** Drop unset values, then encode the rest the way a form field wants them. */
export function encodeParams(params: Record<string, WireValue> = {}): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    out.set(
      key,
      typeof value === "object" ? JSON.stringify(value) : String(value),
    );
  }
  return out;
}

/**
 * Turn a comma-separated id list (`"10,11"`), a JSON array (`"[10, 11]"`) or an array into the
 * list Twist expects. A lone non-numeric token (`EVERYONE`) is passed through as-is, because
 * `recipients` accepts that keyword instead of a list.
 */
export function idList(value: unknown): unknown[] | string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value;
  const text = String(value).trim();
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* fall through to the comma split */ }
  }
  const parts = text.split(",").map((p) => p.trim()).filter((p) => p !== "");
  if (parts.length === 0) return undefined;
  if (parts.every((p) => /^-?\d+$/.test(p))) return parts.map(Number);
  return parts.length === 1 ? parts[0] : parts;
}

/** A JSON-typed param may arrive as an object or as pasted JSON text. */
export function jsonValue(value: unknown): WireValue {
  if (typeof value !== "string") return value as WireValue;
  const text = value.trim();
  if (text === "") return undefined;
  try {
    return JSON.parse(text) as WireValue;
  } catch {
    throw new Error("Expected valid JSON for this field");
  }
}

/**
 * Twist answers with a JSON object, a JSON array, a bare JSON string (`get_local_time`), or
 * nothing at all. Every action returns an object: arrays become `{ items }`, anything else
 * that is not an object becomes `{ result }`.
 */
export function normalize(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return { items: value };
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return { result: value ?? null };
}

/** Return `value` without the named keys. */
export function omit(value: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out = { ...value };
  for (const key of keys) delete out[key];
  return out;
}

export function describeError(status: number, body: TwistErrorBody | undefined): string {
  if (!body) return `Twist returned HTTP ${status}`;
  if (body.error_code !== undefined) {
    const hint = AUTH_ERROR_CODES.includes(body.error_code)
      ? " — the token is missing, expired or revoked; reconnect this connection"
      : "";
    return `Twist error ${body.error_code}: ${body.error_string} (HTTP ${status})${hint}`;
  }
  return `Twist error ${body.error}: ${body.error_message} (HTTP ${status})`;
}

/**
 * The one HTTP path. No credential is set here: the runtime routes the request through the
 * auth `sign` hook, which stamps the bearer header.
 *
 * Success is decided by the parsed body, not by the status line: an error-shaped body on a 2xx
 * would still throw, and a non-2xx without Twist's error shape throws a bare HTTP error.
 */
export async function twist(
  ctx: HookContext,
  options: CallOptions,
): Promise<Record<string, unknown>> {
  const method = options.method ?? "GET";
  const base = `${API_BASE}/api/v${options.version ?? 3}${options.path}`;
  const body = encodeParams(options.params);

  const init: RequestInit = { method, headers: { accept: "application/json" } };
  let url = base;
  if (method === "GET") {
    const qs = body.toString();
    if (qs) url = `${base}?${qs}`;
  } else {
    (init.headers as Record<string, string>)["content-type"] = "application/x-www-form-urlencoded";
    init.body = body.toString();
  }

  const res = await ctx.fetch(url, init);
  const text = await res.text();
  let parsed: unknown;
  if (text.trim() !== "") {
    try {
      parsed = JSON.parse(text);
    } catch {
      if (!res.ok) throw new TwistError(`Twist returned HTTP ${res.status}`, res.status);
      parsed = text;
    }
  }

  const err = asTwistError(parsed);
  if (err || !res.ok) {
    throw new TwistError(
      describeError(res.status, err),
      res.status,
      err?.error_code,
      err?.error_extra,
    );
  }
  return normalize(parsed);
}
