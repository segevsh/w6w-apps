import type { HookContext } from "@w6w/types";

/**
 * SignWell REST API client.
 *
 * Every path, query parameter, request/response field and error shape here was verified against
 * SignWell's own OpenAPI 3.0.1 document (`https://developers.signwell.com/openapi/resources-and-endpoints.json`,
 * ~229KB, fetched 2026-10-06) and live probes of `GET /api/v1/me` made without a key and with a
 * bogus one (2026-10-06).
 *
 * ## One host, one header
 *
 * `servers` declares only `https://www.signwell.com`, every path is under `/api/v1`, and
 * `securitySchemes` is `api_key: { type: apiKey, in: header, name: X-Api-Key }`. This module never
 * sets that header — the runtime routes every request through the auth `sign` hook.
 *
 * ## Error bodies (three shapes, none carries the key)
 *
 *   - Auth and not-found: `{"message": "...", "meta": {"error": "<code>", "message": "...", "messages": [...]}}`.
 *     Measured live: no key → `meta.error = "missing_authorization_key_error"`; a wrong key →
 *     `"api_key_unauthorized_error"`. Both answer HTTP 401, but the verdict is read from the code.
 *   - Validation (400/422): `{"errors": {<field>: [...]}}`, dynamic keys.
 *   - Rate limit (429): `{"error": "<text naming the limit and reset time>"}`.
 *
 * ## No list endpoints for documents or templates
 *
 * The API has no `GET /documents` and no `GET /document_templates` — a document or template is
 * read by id only. That is why this app has no list or search action for either.
 */

export const API_HOST = "www.signwell.com";
export const API_BASE = `https://${API_HOST}/api/v1`;

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

interface SignWellErrorBody {
  message?: string;
  meta?: { error?: string; message?: string; messages?: string[] };
  errors?: unknown;
  error?: string;
}

/** The vendor's own error code, if the body carries one. */
export function errorCode(payload: unknown): string | undefined {
  const code = (payload as SignWellErrorBody | null)?.meta?.error;
  return typeof code === "string" ? code : undefined;
}

/** True when a body is one of SignWell's documented error envelopes. */
export function isErrorEnvelope(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return false;
  const p = payload as SignWellErrorBody;
  return typeof p.meta?.error === "string" || typeof p.error === "string" ||
    (typeof p.errors === "object" && p.errors !== null);
}

/** Turn a SignWell error response into one actionable line, from its body — never the status alone. */
export function formatSignWellError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: SignWellErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as SignWellErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const head = `SignWell ${status} for ${method} ${path}`;
  if (parsed?.meta?.error) {
    const detail = parsed.meta.message ?? parsed.message;
    return `${head}: ${parsed.meta.error}${detail ? ` — ${detail}` : ""}`;
  }
  if (parsed?.errors !== undefined) {
    return `${head}: ${JSON.stringify(parsed.errors).slice(0, 600)}`;
  }
  if (parsed?.error) return `${head}: ${parsed.error}`;
  if (parsed?.message) return `${head}: ${parsed.message}`;
  const trimmed = raw.length > 600 ? `${raw.slice(0, 600)}… (${raw.length} bytes truncated)` : raw;
  return `${head}${trimmed ? `: ${trimmed}` : ""}`;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Parse a `json`-typed param, which arrives as either a live value or the text a form field carried. */
export function asJson<T>(value: unknown, field: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`\`${field}\` is required and must be JSON.`);
  }
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`\`${field}\` is not valid JSON.`);
  }
}

/** Same as {@link asJson}, but an unset field is simply omitted rather than an error. */
export function asJsonOptional<T>(value: unknown, field: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return asJson<T>(value, field);
}

/** A required string id, trimmed. */
export function requireId(value: unknown, field = "id"): string {
  const id = String(value ?? "").trim();
  if (!id) throw new Error(`\`${field}\` is required.`);
  return id;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `X-Api-Key` — the runtime routes every request
 * through the auth `sign` hook.
 */
export class SignWellClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
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
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatSignWellError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
