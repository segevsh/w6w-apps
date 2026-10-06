import type { HookContext } from "@w6w/types";

export const API_BASE = "https://public.api.hospitable.com";
export const API_PREFIX = "/v2";

/** Percent-encode one path segment (ids are the caller's own strings and may hold anything). */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id));
}

/**
 * Accept a JSON value either already parsed or as the JSON text a form field
 * produces. Anything that does not parse passes through untouched so the
 * vendor, not this app, rejects it.
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

/** A list given as a real array or as comma / newline separated text. */
export function listValue(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parts = Array.isArray(value) ? value.map((v) => String(v)) : String(value).split(/[,\n]/);
  const clean = parts.map((s) => s.trim()).filter((s) => s !== "");
  return clean.length ? clean : undefined;
}

export type Query = Record<
  string,
  string | number | boolean | string[] | undefined | null
>;

export interface RequestOptions {
  query?: Query;
  body?: Record<string, unknown>;
}

/**
 * Build `?a=1&b=2`, skipping unset, null and empty values. An array becomes the
 * bracketed repeat form Hospitable documents (`properties[]=a&properties[]=b`),
 * except `include`, which the vendor takes comma-joined (`include=guest,financials`).
 */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      if (key === "include") params.set(key, value.join(","));
      else for (const v of value) params.append(key.endsWith("[]") ? key : `${key}[]`, String(v));
    } else {
      params.set(key, String(value));
    }
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** Drop unset keys so a partial update sends only what the caller supplied. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== "") out[k] = v;
  return out;
}

/**
 * The vendor's error text. Hospitable answers `{"message": "…"}`, and a
 * validation failure adds `errors: { field: [messages] }`.
 */
export function errorText(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const rec = body as Record<string, unknown>;
  const message = typeof rec.message === "string" ? rec.message : undefined;
  const errors = rec.errors;
  let detail: string | undefined;
  if (errors && typeof errors === "object") {
    detail = Object.entries(errors as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : String(v)}`)
      .join("; ");
  } else if (typeof errors === "string") detail = errors;
  if (message && detail) return `${message} (${detail})`;
  return message ?? detail ?? (typeof rec.error === "string" ? rec.error : undefined);
}

/**
 * Thin client over `https://public.api.hospitable.com/v2`. Credentials are never
 * handled here: the runtime routes every `ctx.fetch` through the Auth `sign`
 * hook, which stamps `Authorization: Bearer <token>`.
 */
export class HospitableClient {
  constructor(private readonly ctx: HookContext) {}

  async request(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<unknown> {
    const url = `${API_BASE}${API_PREFIX}${path}${buildQuery(options.query)}`;
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
      } catch {
        parsed = undefined;
      }
    }

    if (!res.ok) {
      const detail = errorText(parsed) ?? (text.trim().slice(0, 200) || res.statusText);
      throw new Error(`Hospitable ${method} ${path} failed: HTTP ${res.status} — ${detail}`);
    }
    // A delete answers with no body; hand back an object either way.
    if (parsed === undefined) return { status: res.status };
    return parsed;
  }
}
