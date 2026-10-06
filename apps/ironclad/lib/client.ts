import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Ironclad Public API client.
 *
 * Everything here was verified on 2026-10-06 against Ironclad's own developer hub
 * (`developer.ironcladapp.com`, whose per-endpoint `.md` pages embed the OpenAPI 3.1 document,
 * `info.version` `1`) plus live probes against `ironcladapp.com`, `eu1.ironcladapp.com`,
 * `demo.ironcladapp.com` and `status.ironcladapp.com`.
 *
 * ## One API, three fixed environments
 *
 * The OpenAPI document declares exactly three servers, and the OAuth service sits on the same
 * host beside the API:
 *
 * | Region | Host                    | API base                                       | OAuth base                           |
 * | ------ | ----------------------- | ---------------------------------------------- | ------------------------------------ |
 * | `us`   | `ironcladapp.com`       | `https://ironcladapp.com/public/api/v1`        | `https://ironcladapp.com/oauth`      |
 * | `eu1`  | `eu1.ironcladapp.com`   | `https://eu1.ironcladapp.com/public/api/v1`    | `https://eu1.ironcladapp.com/oauth`  |
 * | `demo` | `demo.ironcladapp.com`  | `https://demo.ironcladapp.com/public/api/v1`   | `https://demo.ironcladapp.com/oauth` |
 *
 * The environments are separate stacks with separate accounts and OAuth clients, so the region is
 * a property of the Connection (`display.region`, recorded by `afterConnect`), never of an Action.
 * The vendor's auth guide also mentions an `na1` subdomain; it answers on the wire but is not in
 * the OpenAPI `servers` list, so it is deliberately not modelled.
 *
 * ## Errors
 *
 * Every API failure is `{"code": "...", "message": "...", "param"?: "..."}` — `code` is a stable
 * machine value (`UNAUTHORIZED`, `MISSING_PARAM`, `INVALID_PARAM`, `INVALID_STATE`, …). The
 * OAuth token endpoint is separate and answers RFC 6749 `{"error", "error_description"}`.
 *
 * ## Pagination
 *
 * List endpoints take zero-based `page` and `pageSize` (default 20, max 100) and answer
 * `{page, pageSize, count, list}`, where `count` is the total across all pages.
 */

export type Region = "us" | "eu1" | "demo";

export const REGIONS: Record<Region, { label: string; host: string }> = {
  us: { label: "US production", host: "ironcladapp.com" },
  eu1: { label: "EU production", host: "eu1.ironcladapp.com" },
  demo: { label: "Demo", host: "demo.ironcladapp.com" },
};

export const REGION_OPTIONS = (Object.keys(REGIONS) as Region[]).map((value) => ({
  value,
  label: `${REGIONS[value].label} (${REGIONS[value].host})`,
}));

/** Every OAuth resource scope this app's Actions need, copied from the OpenAPI `OAuth2` scheme. */
export const SCOPES = [
  "public.workflows.readWorkflows",
  "public.workflows.createWorkflows",
  "public.workflows.updateWorkflows",
  "public.workflows.cancel",
  "public.workflows.pauseAndResume",
  "public.workflows.readApprovals",
  "public.workflows.updateApprovals",
  "public.workflows.readComments",
  // Comment creation is gated by a *records* scope in the vendor's OpenAPI document
  // (`public.records.createComments`, labelled "Create Workflow Comments"); the workflows-prefixed
  // `createComments` scope belongs to the deprecated `POST /workflows/{id}/comment` route.
  "public.records.createComments",
  "public.workflows.readSignatures",
  "public.workflows.readSchemas",
  "public.records.readRecords",
  "public.records.createRecords",
  "public.records.updateRecords",
  "public.records.deleteRecords",
  "public.records.readSchemas",
  "public.entities.readEntities",
  "public.entities.createEntities",
  "public.entities.deleteEntities",
  "public.webhooks.readWebhooks",
  "public.webhooks.createWebhooks",
  "public.webhooks.deleteWebhooks",
];

export function normalizeRegion(value: unknown): Region {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "eu1" || v === "demo" ? v : "us";
}

export function apiBase(region: Region): string {
  return `https://${REGIONS[region].host}/public/api/v1`;
}

export function oauthBase(region: Region): string {
  return `https://${REGIONS[region].host}/oauth`;
}

/** The region `afterConnect` recorded on the Connection. An unrecorded one is US production. */
export function regionFromConnection(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as { region?: unknown };
  return normalizeRegion(display.region);
}

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful here. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/** Normalise a `multiselect` param (or a comma-separated string) into a list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Path-escape a caller-supplied id so a pasted `/` or `?` cannot change the route. */
export function encodeId(id: unknown): string {
  const s = String(id ?? "").trim();
  if (!s) throw new Error("an id is required");
  return encodeURIComponent(s);
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

interface ErrorBody {
  code?: string;
  message?: string;
  param?: string;
}

/**
 * One actionable line from Ironclad's `{code, message, param}` error body.
 *
 * The `code` is kept because the fix differs: `UNAUTHORIZED` is the credential, `INVALID_PARAM`
 * names a field in `param`, `INVALID_STATE` is a workflow in the wrong step. A bare status hides
 * which one. The credential never enters this module.
 */
export function formatIroncladError(
  status: number,
  method: string,
  path: string,
  raw: string,
  retryAfter?: string | null,
): string {
  let parsed: ErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (!parsed.code && !parsed.message)) {
    return truncate(`Ironclad ${status} for ${method} ${path}: ${raw}`, 1000);
  }
  const parts = [
    `Ironclad ${status} ${parsed.code ?? "error"} for ${method} ${path}`,
    parsed.param ? `param \`${parsed.param}\`` : undefined,
    parsed.message,
    status === 429
      ? `rate limited${retryAfter ? `; retry after ${retryAfter}s` : ""} (limits are per company)`
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class IroncladClient {
  readonly base: string;
  readonly oauthRoot: string;

  constructor(private ctx: HookContext) {
    const region = regionFromConnection(ctx.connection);
    this.base = apiBase(region);
    this.oauthRoot = oauthBase(region);
  }

  /** Parse the JSON body; a 204 (cancel, pause, delete, …) resolves to `undefined`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * `GET {host}/oauth/userinfo` — the token's own user, company and granted scopes. It lives beside
   * the API rather than under it, and needs no resource scope.
   */
  userInfo<T = unknown>(): Promise<T> {
    return this.json<T>(`${this.oauthRoot}/userinfo`);
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(path.startsWith("https://") ? path : `${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Multi-valued parameters (`status`) are documented as ONE comma-separated value.
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatIroncladError(
          res.status,
          init.method ?? "GET",
          url.pathname,
          detail,
          res.headers.get("retry-after"),
        ),
      );
    }
    return res;
  }
}
