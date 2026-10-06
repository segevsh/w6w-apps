import type { HookContext, Param, RedactedConnection } from "@w6w/types";

/**
 * Contentstack Content Management API (CMA) v3. Verified 2026-10-06 against
 * the vendor's CMA reference
 * (`https://www.contentstack.com/docs/developers/apis/content-management-api.md`)
 * and the OpenAPI file it links (`cma-openapi-3.json` v3.0.1, 138 paths).
 *
 * ## Regions
 *
 * A stack lives in exactly one of seven fixed regions, each with its own API
 * host (the reference's "Base URL" list). The region is collected once on the
 * Connection and echoed onto its redacted `display` by `afterConnect`, so
 * actions pick a host without seeing the credential. The OpenAPI file's own
 * `servers` block is wrong for two of them (it lists `azure-na-cdn…` and drops
 * GCP), so the prose list is used; all seven hosts were probed live on
 * 2026-10-06 and each answers the same JSON `412 {"error_code":109}` for an
 * unknown API key.
 *
 * ## Errors
 *
 * Failures are `{ error_message, error_code, errors }`. The status code is a
 * hint: `412` means the stack API key is unknown (code 109), `401` that the
 * token is rejected (code 105). Callers read the body, not the status alone.
 */
export type Region = "na" | "eu" | "au" | "azure-na" | "azure-eu" | "gcp-na" | "gcp-eu";

export const REGIONS: Region[] = ["na", "eu", "au", "azure-na", "azure-eu", "gcp-na", "gcp-eu"];

export const HOSTS: Record<Region, string> = {
  "na": "api.contentstack.io",
  "eu": "eu-api.contentstack.com",
  "au": "au-api.contentstack.com",
  "azure-na": "azure-na-api.contentstack.com",
  "azure-eu": "azure-eu-api.contentstack.com",
  "gcp-na": "gcp-na-api.contentstack.com",
  "gcp-eu": "gcp-eu-api.contentstack.com",
};

export function asRegion(v: unknown): Region {
  return REGIONS.includes(v as Region) ? (v as Region) : "na";
}

export function regionFromConnection(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as { region?: string };
  return asRegion(display.region);
}

export function apiBase(region: Region): string {
  return `https://${HOSTS[region]}/v3`;
}

/** Optional `branch` header, shared by every action that is branch-aware. */
export const BRANCH_PARAM: Param = {
  key: "branch",
  label: "Branch",
  type: "string",
  hint: "Branch UID to act on. Leave empty for the stack's default (main) branch.",
};

// ---------------------------------------------------------------------------
// Parameter readers
// ---------------------------------------------------------------------------

/** Trimmed non-empty string, else `undefined`. Numbers are stringified. */
export function str(v: unknown): string | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

export function int(name: string, v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isInteger(n)) throw new Error(`\`${name}\` must be an integer`);
  return n;
}

export function bool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

/** A `json` param arrives parsed in the reference runtime but as a raw string on some hosts. */
export function jsonValue(name: string, v: unknown): unknown {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (!t) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    throw new Error(`\`${name}\` is not valid JSON`);
  }
}

export function jsonObject(name: string, v: unknown): Record<string, unknown> | undefined {
  const parsed = jsonValue(name, v);
  if (parsed === undefined) return undefined;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`\`${name}\` must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

export function jsonArray(name: string, v: unknown): unknown[] | undefined {
  const parsed = jsonValue(name, v);
  if (parsed === undefined) return undefined;
  if (!Array.isArray(parsed)) throw new Error(`\`${name}\` must be a JSON array`);
  return parsed;
}

/** A list of strings from an array, or a comma separated string. */
export function strList(v: unknown): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const parts = Array.isArray(v) ? v.map(String) : String(v).split(",");
  const out = parts.map((p) => p.trim()).filter(Boolean);
  return out.length ? out : undefined;
}

/** Unwrap a reader result that the action cannot run without. */
export function need<T>(name: string, v: T | undefined): T {
  if (v === undefined) throw new Error(`\`${name}\` is required`);
  return v;
}

/** One URL path segment, percent-encoded. */
export function seg(v: string): string {
  return encodeURIComponent(v);
}

/** Remove keys whose value is `undefined`. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

export type Query = Record<string, unknown>;

export interface CallOptions {
  query?: Query;
  body?: unknown;
  /** Value of the `branch` header, when the call is aimed at a non-default branch. */
  branch?: string;
  /** Extra request headers (e.g. `api_version: "3.2"` for bulk and job endpoints). */
  headers?: Record<string, string | undefined>;
}

function queryString(query: Query | undefined): string {
  if (!query) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    sp.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Contentstack's own error envelope. */
export interface ContentstackError {
  error_message?: string;
  error_code?: number;
  errors?: Record<string, unknown>;
}

function describe(body: unknown, raw: string): string {
  if (body && typeof body === "object") {
    const b = body as ContentstackError;
    if (b.error_message || b.error_code !== undefined) {
      const detail = b.errors && Object.keys(b.errors).length ? ` ${JSON.stringify(b.errors)}` : "";
      return `${b.error_message ?? "error"} (code ${b.error_code ?? "?"})${detail}`;
    }
  }
  return raw.slice(0, 300);
}

/**
 * One Contentstack call. `path` begins with `/` and is relative to `/v3`.
 * Never sets credentials — `sign` stamps the `api_key` and `authorization`
 * headers.
 */
export async function call(
  ctx: HookContext,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  opts: CallOptions = {},
): Promise<Record<string, unknown>> {
  const region = regionFromConnection(ctx.connection);
  const headers: Record<string, string> = { accept: "application/json" };
  for (const [k, v] of Object.entries(opts.headers ?? {})) if (v !== undefined) headers[k] = v;
  if (opts.branch) headers.branch = opts.branch;
  const init: RequestInit = { method, headers };
  if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  const res = await ctx.fetch(`${apiBase(region)}${path}${queryString(opts.query)}`, init);
  const raw = await res.text().catch(() => "");
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : undefined;
  } catch {
    parsed = undefined;
  }
  if (!res.ok) {
    throw new Error(`Contentstack ${res.status} for ${method} ${path}: ${describe(parsed, raw)}`);
  }
  if (parsed === undefined) return {};
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { data: parsed };
  }
  return parsed as Record<string, unknown>;
}
