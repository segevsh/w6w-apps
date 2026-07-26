import type { HookContext, RedactedConnection } from "@w6w/types";

/** The Salesforce API version this app targets. */
export const API_VERSION = "v60.0";
export const DATA_PATH = `/services/data/${API_VERSION}`;

/**
 * Every Salesforce org lives on its own host — `acme.my.salesforce.com`,
 * `acme--sandbox.sandbox.my.salesforce.com`, and so on. A manifest cannot
 * enumerate those, so `w6w.network.allow` declares `*.salesforce.com` (which
 * covers login/test and every My Domain) plus `*.force.com` for orgs on the
 * older domain.
 *
 * The instance URL comes from the Connection: OAuth returns it alongside the
 * token, and the token method collects it. Either way `afterConnect` records
 * it on the connection's redacted `display`.
 */
export function instanceFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { instanceUrl?: string };
  const url = display.instanceUrl;
  if (!url) {
    throw new Error(
      "Salesforce connection has no instance URL — reconnect the org so it can be recorded.",
    );
  }
  return url.replace(/\/+$/, "");
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Absolute path under the instance host, bypassing the versioned data path. */
  absolutePath?: boolean;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/**
 * Parse the "Fields" JSON param into the record body Salesforce expects.
 * Rejects anything that is not an object, so a typo fails here rather than as
 * an opaque 400 from Salesforce.
 */
export function fields(raw: unknown, paramName = "fields"): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") {
    throw new Error(`\`${paramName}\` is required and must be a JSON object of field -> value.`);
  }
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object of field -> value.`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Salesforce object and field names are identifiers, not free text — reject
 * anything that is not one instead of letting it into a URL path.
 */
export function sobjectName(name: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(
      `\`${name}\` is not a valid Salesforce object name (letters, digits and underscores only).`,
    );
  }
  return name;
}

interface SalesforceError {
  message?: string;
  errorCode?: string;
  fields?: string[];
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class SalesforceClient {
  private instance: string;

  constructor(private ctx: HookContext) {
    this.instance = instanceFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const prefix = options.absolutePath ? "" : DATA_PATH;
    const url = new URL(`${this.instance}${prefix}${path}`);
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
        // Salesforce returns an ARRAY of errors; `fields` names the offending
        // columns, which is usually the actionable part.
        const parsed = JSON.parse(text) as SalesforceError[] | SalesforceError;
        const list = Array.isArray(parsed) ? parsed : [parsed];
        detail = list
          .map((e) =>
            [e.errorCode, e.message, e.fields?.length && `[${e.fields.join(", ")}]`]
              .filter(Boolean).join(" ")
          )
          .join("; ") || text;
      } catch { /* keep the raw body */ }
      throw new Error(`Salesforce ${res.status} for ${init.method} ${url.pathname}: ${detail}`);
    }
    // Update and delete answer 204 with no body.
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
