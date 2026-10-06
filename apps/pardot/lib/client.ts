import type { HookContext, RedactedConnection } from "@w6w/types";

/** Documented API root for version 5 — every object lives under it. */
export const OBJECTS_PATH = "/api/v5/objects";

/**
 * Account Engagement answers on one of two hosts and the wrong one is not a
 * "not found": it fails with `201 Business Unit specified in
 * Pardot-Business-Unit-Id header not found or inactive` (error-codes page), the
 * same error a mistyped business unit id gives. Production accounts use
 * `pi.pardot.com`; Account Engagement developer orgs and sandboxes use
 * `pi.demo.pardot.com` (authentication page, "Account Type" table).
 */
export const PRODUCTION_HOST = "pi.pardot.com";
export const DEMO_HOST = "pi.demo.pardot.com";
export const HOSTS: readonly string[] = [PRODUCTION_HOST, DEMO_HOST];

/** The host a connection talks to, as recorded by an auth method's `afterConnect`. */
export function hostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { host?: string };
  if (display.host === undefined) return PRODUCTION_HOST;
  if (!HOSTS.includes(display.host)) {
    throw new Error(
      `Pardot connection records host "${display.host}"; expected ${HOSTS.join(" or ")}.`,
    );
  }
  return display.host;
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: string;
  query?: Query;
  body?: unknown;
}

/** Treat a blank form field as absent. */
export function unset<T>(v: T | undefined | null | ""): T | undefined {
  return v === "" || v === null ? undefined : v;
}

/** A Pardot id is a positive integer; reject anything else before it reaches a URL path. */
export function idOf(value: unknown, name = "id"): number {
  const n = typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) {
    throw new Error(`\`${name}\` must be a positive integer Account Engagement id.`);
  }
  return n;
}

/** Parse a JSON object param (a string from a form, or an object from a workflow). */
export function jsonObject(raw: unknown, name: string): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") return {};
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`\`${name}\` must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

/** v5 errors are `{ "code": <n>, "message": "..." }` (error-codes page). */
export function errorText(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return undefined;
  const { code, message } = payload as { code?: unknown; message?: unknown };
  if (typeof message !== "string") return undefined;
  return typeof code === "number" ? `[${code}] ${message}` : message;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization or the business
 * unit header — the runtime routes every request through the auth `sign` hook,
 * the only code that holds the credential.
 */
export class PardotClient {
  private host: string;

  constructor(private ctx: HookContext) {
    this.host = hostFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`https://${this.host}${OBJECTS_PATH}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      let detail = text;
      try {
        detail = errorText(JSON.parse(text)) ?? text;
      } catch { /* keep the raw body */ }
      throw new Error(`Pardot ${res.status} for ${method} ${url.pathname}: ${detail}`);
    }
    // Delete, remove-tag and some updates answer 204 with no body.
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
