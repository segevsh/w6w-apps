import type { HookContext } from "@w6w/types";

/** The one API host. Verified against developers.savvycal.com (servers[0].url). */
export const API_BASE = "https://api.savvycal.com";
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Cursor-paginated list envelope: `{entries, metadata: {after, before, limit}}`. */
export interface Page<T> {
  entries: T[];
  metadata: { after?: string | null; before?: string | null; limit?: number };
}

/** Drop undefined / null / empty-string members so optional inputs never reach the wire. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export function encodeId(id: unknown): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Encode each `/`-separated segment but keep the slashes (`America/New_York`). */
export function encodeSegments(path: unknown): string {
  return String(path ?? "").trim().split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes)`;
}

/**
 * Parse an optional JSON input. Accepts an already-parsed value or a JSON
 * string; throws a labelled error on bad JSON.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * SavvyCal answers a bad or missing credential with a bare `text/plain` body
 * (`Unauthenticated`, 15 bytes, measured 2026-10-06), not JSON — so errors are
 * formatted from the raw text, JSON when it parses.
 */
export function formatError(status: number, method: string, path: string, raw: string): string {
  let detail = raw.trim();
  try {
    const parsed = JSON.parse(raw) as { error?: unknown; errors?: unknown; message?: string };
    const inner = parsed.errors ?? parsed.error ?? parsed.message;
    if (inner !== undefined) detail = typeof inner === "string" ? inner : JSON.stringify(inner);
  } catch { /* plain text */ }
  return truncate(`SavvyCal ${status} for ${method} ${path}: ${detail || "(empty body)"}`, 1000);
}

export class SavvyCalClient {
  constructor(private ctx: HookContext) {}

  /** Issue a request and return the parsed JSON body (undefined for an empty body). */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), { method, headers, body });
    const text = await res.text();
    if (!res.ok) throw new Error(formatError(res.status, method, `${API_PREFIX}${path}`, text));
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `SavvyCal ${res.status} for ${method} ${API_PREFIX}${path} returned a non-JSON body: ${
          truncate(text, 200)
        }`,
      );
    }
  }
}

/** Remove the webhook signing secret from a webhook object before it leaves an Action. */
export function stripWebhookSecret<T>(webhook: T): T {
  if (!webhook || typeof webhook !== "object" || Array.isArray(webhook)) return webhook;
  const out: Record<string, unknown> = { ...(webhook as Record<string, unknown>) };
  delete out.secret;
  return out as T;
}

/** Shared pagination params for every list action. */
export const pagingParams = [
  {
    key: "limit",
    label: "Limit",
    type: "number" as const,
    default: 20,
    hint: "Entries per page, 1-100 (vendor default 20).",
    validation: { min: 1, max: 100, integer: true },
  },
  {
    key: "after",
    label: "After cursor",
    type: "string" as const,
    hint: "Return entries after this cursor (`metadata.after` of the previous page).",
  },
  {
    key: "before",
    label: "Before cursor",
    type: "string" as const,
    hint: "Return entries before this cursor (`metadata.before` of the previous page).",
  },
];
