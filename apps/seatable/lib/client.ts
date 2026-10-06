import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * SeaTable Cloud REST client.
 *
 * Verified on 2026-10-06 against the official API reference (`api.seatable.io`,
 * ReadMe-hosted, OpenAPI `info.version` 6.2 — the spec is embedded in every
 * reference page) and live probes against `cloud.seatable.io`.
 *
 * ## One host, two prefixes
 *
 * SeaTable Cloud is a single host, `cloud.seatable.io`. Two URL families sit on
 * it and take two different credentials:
 *
 *  - `/api/v2.1/…` (account operations and the Base-Token exchange) — takes an
 *    API-Token or Account-Token. Only the exchange is used here, from the auth
 *    hooks (`auth/api-token.ts`).
 *  - `/api-gateway/api/v2/dtables/{base_uuid}/…` (base operations) — takes the
 *    **Base-Token** only. Every Action in this app lives here.
 *
 * The exchange response names the base server (`dtable_server`). On Cloud it is
 * always `https://cloud.seatable.io/api-gateway/`; a self-hosted install answers
 * with its own host, which this app's egress allowlist cannot reach.
 *
 * ## Two error spellings
 *
 * The account API answers `{"error_msg": "Permission denied."}`, the gateway
 * answers `{"error_message": "invalid token"}` (both measured live, both 403 for
 * a bad token). {@link describeError} reads both, plus `detail` (Django REST
 * style) and a bare string.
 *
 * ## Rate limits
 *
 * 200 requests/minute per base on Cloud, plus monthly limits that scale with the
 * plan. An exceeded limit is a bare `429` with no body.
 */
export const HOST = "cloud.seatable.io";
export const ORIGIN = `https://${HOST}`;
export const GATEWAY = `${ORIGIN}/api-gateway/api/v2`;
export const ACCESS_TOKEN_URL = `${ORIGIN}/api/v2.1/dtable/app-access-token/`;

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Query;
  body?: unknown;
}

/** Turn a SeaTable error response into one readable line. */
export function describeError(status: number, text: string): string {
  if (status === 429) {
    return "rate limited (429) — SeaTable Cloud allows 200 base requests/minute per base, plus " +
      "a monthly limit that depends on the plan";
  }
  let detail = "";
  try {
    const body = JSON.parse(text) as Record<string, unknown> | string | null;
    if (typeof body === "string") detail = body;
    else if (body && typeof body === "object") {
      const found = body.error_message ?? body.error_msg ?? body.detail ?? body.error ??
        body.message;
      detail = typeof found === "string" ? found : found ? JSON.stringify(found) : "";
    }
  } catch {
    detail = text.replace(/\s+/g, " ").trim().slice(0, 200);
  }
  return detail ? `${status}: ${detail}` : `HTTP ${status}`;
}

/** The base UUID the connection was made for, from the redacted Connection's display data. */
export function baseUuidFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { baseUuid?: string };
  const uuid = String(display.baseUuid ?? "").trim();
  if (!uuid) {
    throw new Error("this connection has no base — reconnect it with the base's API token");
  }
  return uuid;
}

/**
 * Thin wrapper over `ctx.fetch`, scoped to one base. Never sets Authorization —
 * the runtime routes every request through the auth `sign` hook, which stamps
 * the Base-Token.
 */
export class SeaTableClient {
  readonly baseUuid: string;

  constructor(private ctx: HookContext) {
    this.baseUuid = baseUuidFromConnection(ctx.connection);
  }

  /** `path` is relative to `/api-gateway/api/v2/dtables/{base_uuid}`. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${GATEWAY}/dtables/${encodeURIComponent(this.baseUuid)}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
    const init: RequestInit = {
      method: options.method ?? "GET",
      headers: { accept: "application/json" },
    };
    if (options.body !== undefined) {
      init.headers = { ...init.headers, "content-type": "application/json" };
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`SeaTable ${describeError(res.status, text)}`);
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return { raw: text } as T;
    }
  }
}

/** Percent-encode one URL path segment. */
export const encodeSegment = encodeURIComponent;
