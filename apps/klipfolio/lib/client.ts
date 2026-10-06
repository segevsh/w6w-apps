import type { HookContext } from "@w6w/types";

/**
 * Base URL from the Klipfolio API reference ("Getting Started"): HTTPS only,
 * `https://app.klipfolio.com/api/1.0/`. The version segment may also be `1`.
 */
export const API_URL = "https://app.klipfolio.com/api/1.0";

/** Percent-encode one path segment (ids are caller strings). */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/**
 * Accept a list as a real array or as the comma-separated text a form field
 * produces. Empty entries are dropped; an empty result is `undefined`.
 */
export function strList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/** Accept a JSON value parsed or as JSON text; unparseable text passes through for the vendor to reject. */
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

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Build `?a=1&b=2`, skipping unset, null and empty values. */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** Klipfolio's envelope: `{ meta: { success, status, ... }, data: {...} }`. */
export interface Meta {
  success?: boolean;
  status?: number;
  count?: number;
  total?: number;
  location?: string;
  instance_location?: string;
  error_code?: string;
  error_desc?: string;
  error_id?: string;
}

export interface Envelope {
  meta: Meta;
  // deno-lint-ignore no-explicit-any
  data: any;
}

/** One human line from a parsed error body, carrying the vendor error code when present. */
export function errorText(body: unknown, raw = ""): string {
  const meta = (body as { meta?: Meta } | null)?.meta;
  if (meta && (meta.error_desc || meta.error_code)) {
    return meta.error_code
      ? `${meta.error_desc ?? ""} (${meta.error_code})`.trim()
      : meta.error_desc!;
  }
  return raw.trim().slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

/**
 * Thin client over `https://app.klipfolio.com/api/1.0`. Credentials are never
 * handled here: the runtime routes every `ctx.fetch` through the Auth `sign`
 * hook, which stamps the `kf-api-key` header.
 */
export class KlipfolioClient {
  constructor(private readonly ctx: HookContext) {}

  async request(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<Envelope> {
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

    const meta = (parsed as { meta?: Meta } | undefined)?.meta;
    if (!res.ok || meta?.success === false) {
      throw new Error(
        `Klipfolio ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}`,
      );
    }
    if (parsed === undefined) {
      // Some reads (datasource instance data) return raw CSV-like text, not JSON.
      return { meta: { success: true, status: res.status }, data: text };
    }
    const env = parsed as Partial<Envelope>;
    return { meta: env.meta ?? {}, data: env.data ?? {} };
  }
}

/** Drop `undefined` values so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** Last path segment of a `location` such as `/datasources/5d88...`. */
export function idFromLocation(location: string | undefined): string | undefined {
  if (!location) return undefined;
  const parts = location.split("/").filter((p) => p !== "");
  return parts.length > 0 ? parts[parts.length - 1] : undefined;
}

/** A list response: the array under `data` (its key varies by resource) plus `meta.count/total`. */
export function listResult(env: Envelope) {
  const values = env.data && typeof env.data === "object" ? Object.values(env.data) : [];
  const items = (values.find((v) => Array.isArray(v)) as unknown[] | undefined) ?? [];
  return { items, count: env.meta.count ?? items.length, total: env.meta.total ?? items.length };
}

/** A single-resource response: the `data` object itself. */
export function recordResult(env: Envelope) {
  return env.data;
}

/** A create response: the new resource's id and location, from `meta`. */
export function createdResult(env: Envelope) {
  return {
    id: idFromLocation(env.meta.location),
    location: env.meta.location,
    instance_location: env.meta.instance_location,
  };
}

/** An update/delete/operation response: `{ success, op }`. */
export function okResult(env: Envelope) {
  return { success: env.meta.success ?? true, op: env.data?.op_requested };
}

/** The bulk-refresh response: queue counts and any per-data-source failures. */
export function refreshResult(env: Envelope) {
  const d = env.data ?? {};
  return {
    success: d.success ?? env.meta.success ?? true,
    op: d.op_requested,
    total_datasources_requested: d.total_datasources_requested,
    total_instances_requested: d.total_instances_requested,
    total_instances_queued: d.total_instances_queued,
    failed_results: d.failed_results,
  };
}

/** Instance data: JSON when the API sends JSON, otherwise the raw CSV-like text. */
export function dataResult(env: Envelope) {
  return { data: env.data };
}
