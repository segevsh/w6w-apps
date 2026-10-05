import type { HookContext } from "@w6w/types";

/** Every REST API v2 endpoint lives on this one host. */
export const API_BASE = "https://rest.ripplingapis.com";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** A list response: `{ results: [...], next_link: <url|null>, __meta?: {...} }`. */
export interface RipplingListBody<T = unknown> {
  results?: T[];
  next_link?: string | null;
  __meta?: { redacted_fields?: Array<{ name?: string; reason?: string }> };
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Drop undefined / null / empty-string members so a PATCH only carries what was set. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Comma-separated lists (`expand`) accept either an array or a ready-made string. */
export function toCsv(v: string[] | string | undefined | null): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items.join(",") : undefined;
}

/**
 * `next_link` is a full URL carrying a `cursor` query parameter. Rippling's own
 * instruction is to request it as-is; this app never fetches a URL a response
 * handed it (the host would be attacker-influenced data), so it lifts the
 * `cursor` value out and re-issues the request against `API_BASE` instead.
 */
export function cursorFromLink(link: string | null | undefined): string | null {
  if (!link) return null;
  try {
    return new URL(link).searchParams.get("cursor");
  } catch {
    return null;
  }
}

/** Accept a bare cursor token or a pasted `next_link` URL. */
export function normalizeCursor(value: string | undefined | null): string | undefined {
  const v = String(value ?? "").trim();
  if (!v) return undefined;
  if (/^https?:\/\//i.test(v)) return cursorFromLink(v) ?? undefined;
  return v;
}

export function asJsonObject(value: unknown, label: string): Record<string, unknown> {
  let parsed = value;
  if (typeof value === "string") {
    if (!value.trim()) throw new Error(`${label} is required`);
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

/**
 * Rippling's error bodies observed live (2026-10-05) on a missing and on a
 * fabricated token alike are `{"ok": false, "error": "<message>"}`; the docs
 * name a request id header (`x-rippling-request-id`) to quote to support.
 */
export function formatRipplingError(
  status: number,
  method: string,
  path: string,
  raw: string,
  requestId?: string | null,
): string {
  let message = "";
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const err = parsed.error ?? parsed.message ?? parsed.detail;
    message = typeof err === "string" ? err : err ? JSON.stringify(err) : "";
  } catch { /* not JSON */ }
  const hint = status === 429
    ? " — burst limit is 300 requests per 10 seconds; back off exponentially"
    : status === 403
    ? " — the token lacks a scope this endpoint needs, or its owner's permission profile cannot see the data"
    : "";
  const rid = requestId ? ` [request ${requestId}]` : "";
  return truncate(
    `Rippling ${status} for ${method} ${path}: ${message || truncate(raw, 300)}${hint}${rid}`,
    1000,
  );
}

export class RipplingClient {
  constructor(private ctx: HookContext) {}

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const url = new URL(`${API_BASE}${path}`);
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
        formatRipplingError(
          res.status,
          method,
          url.pathname,
          detail,
          res.headers.get("x-rippling-request-id"),
        ),
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
