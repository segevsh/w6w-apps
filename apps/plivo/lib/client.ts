import type { HookContext } from "@w6w/types";

export const API_ORIGIN = "https://api.plivo.com";
export const API_PREFIX = "/v1/Account";

/** Query/body values a caller may leave unset. */
export type Loose = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: string;
  query?: Record<string, Loose>;
  /** JSON body — Plivo's REST API takes `application/json` for every write. */
  json?: Record<string, unknown>;
}

/**
 * The Account Auth ID, surfaced by `auth/basic.ts` through `afterConnect`.
 *
 * Every Plivo URL embeds the Auth ID (`/v1/Account/{auth_id}/...`), but the
 * credential itself only reaches `sign`. The ID is not a secret (it is the
 * Basic-auth *username* and appears in every `resource_uri`), so it rides in the
 * connection's display metadata, which is what actions are allowed to read.
 */
export function authIdFromCtx(ctx: HookContext): string {
  const id = ctx.connection?.display?.authId;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Plivo Auth ID missing from connection. Reconnect the Plivo account.");
  }
  return id;
}

/** Drop unset values so an optional filter never reaches the wire as `key=`. */
export function defined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/** A path segment from user input: required, trimmed, and percent-encoded. */
export function segment(name: string, value: unknown): string {
  const s = typeof value === "string"
    ? value.trim()
    : typeof value === "number"
    ? String(value)
    : "";
  if (!s) throw new Error(`\`${name}\` is required.`);
  return encodeURIComponent(s);
}

/** Plivo takes several destinations as one string joined by `<`. */
export function joinDestinations(value: string | string[] | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const list = Array.isArray(value) ? value : [value];
  const cleaned = list.map((v) => String(v).trim()).filter(Boolean);
  return cleaned.length ? cleaned.join("<") : undefined;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization — the runtime routes
 * the request through the auth `sign` hook.
 *
 * Plivo's URLs REQUIRE the trailing slash (`/Message/`, not `/Message`);
 * callers pass paths that already carry it.
 */
export class PlivoClient {
  private readonly authId: string;

  constructor(private ctx: HookContext, authId?: string) {
    this.authId = authId ?? authIdFromCtx(ctx);
  }

  /** `path` is relative to the account, e.g. `Message/` or `Call/{uuid}/`. */
  url(path: string): string {
    return `${API_ORIGIN}${API_PREFIX}/${encodeURIComponent(this.authId)}/${path}`;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const u = new URL(this.url(path));
    for (const [k, v] of Object.entries(defined(options.query ?? {}))) {
      u.searchParams.set(k, String(v));
    }
    const method = options.method ?? "GET";
    const init: RequestInit = { method, headers: {} };
    if (options.json !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(defined(options.json));
    }

    const res = await this.ctx.fetch(u.toString(), init);
    // Errors are not reliably JSON: an auth failure is the plain-text body
    // "Could not verify your access level for that URL." with a 401.
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(`Plivo ${res.status} ${res.statusText} for ${method} ${u.pathname}: ${text}`);
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Plivo ${res.status} for ${method} ${u.pathname}: response was not JSON`);
    }
  }
}
