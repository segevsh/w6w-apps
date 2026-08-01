import type { HookContext } from "@w6w/types";

/**
 * Xero Accounting API — a single fixed host, unlike Jira/Salesforce/Mailchimp
 * where the API host itself is per-tenant. What varies per tenant here is one
 * request header (`Xero-tenant-id`), not the host, so there is nothing for
 * this client to resolve from the Connection — `auth/oauth2.ts`'s `sign` hook
 * stamps that header directly from `ctx.connection.display.tenantId`
 * (discovered by `afterConnect`, see that file's doc comment).
 */
export const API_URL = "https://api.xero.com/api.xro/2.0";

/** Discovers which Xero organisations ("tenants") a token can reach. */
export const CONNECTIONS_URL = "https://api.xero.com/connections";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Drop keys the caller left unset so a merge doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Parse the "Additional fields" / "Fields" JSON params into a plain object.
 * Rejects anything that is not an object, so a typo fails here rather than as
 * an opaque 400 from Xero.
 */
export function jsonObject(raw: unknown, paramName: string): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") return {};
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Parse the "Line items" JSON param into an array. Rejects anything that is
 * not an array, so a typo fails here rather than as an opaque 400 from Xero.
 */
export function jsonArray(raw: unknown, paramName: string): unknown[] {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON array.`);
  }
  return parsed;
}

interface XeroValidationError {
  Message?: string;
}
interface XeroElement {
  ValidationErrors?: XeroValidationError[];
}
interface XeroErrorBody {
  Type?: string;
  Message?: string;
  Elements?: XeroElement[];
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization or
 * Xero-tenant-id — the runtime routes every request through the auth `sign`
 * hook, which injects both.
 */
export class XeroClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
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
      let detail = text;
      try {
        // Xero's validation failures nest the actionable message under
        // Elements[].ValidationErrors[] rather than the top-level Message.
        const body = JSON.parse(text) as XeroErrorBody;
        const nested = body.Elements
          ?.flatMap((e) => e.ValidationErrors ?? [])
          .map((e) => e.Message)
          .filter(Boolean);
        detail = nested?.length ? nested.join("; ") : body.Message ?? text;
      } catch { /* keep the raw body */ }
      throw new Error(`Xero ${res.status} for ${init.method} ${url.pathname}: ${detail}`);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
