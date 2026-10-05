import type { HookContext } from "@w6w/types";

/**
 * Workday REST client.
 *
 * Verified 2026-10-05 against the Workday REST Services Directory
 * (community.workday.com/sites/default/files/file-hosting/restapi) and the
 * Swagger 2.0 documents it publishes per service (`<service>_v<N>_20261003_oas2.json`):
 * `common` v1, `staffing` v7, `absenceManagement` v5, `person` v4, `timeTracking` v7.
 *
 * ## The host is per-tenant, and so is the path
 *
 * Every spec declares `host: "<tenantHostname>"` and a `basePath` of `/<service>/<version>`.
 * The directory's own "try it" client builds the token URL as
 * `https://{host}/ccx/oauth2/{tenant}/token`, and Workday's published URL form for
 * the REST services is `https://{host}/ccx/api/{service}/{version}/{tenant}/{resource}`.
 * Data-centre hosts live under `*.workday.com` (e.g. `wd2-impl-services1.workday.com`)
 * and `*.myworkday.com` (e.g. `wd5-services1.myworkday.com`,
 * `services1.wd503.myworkday.com`). The host is therefore connection data, validated
 * here against exactly those two suffixes — never accepted as an arbitrary URL.
 *
 * ## UNCONFIRMED: the `common` service prefix
 *
 * The `common` spec's `basePath` is `/api/common/v1`, which does not fit the
 * `/ccx/api/{service}/{version}` form the other four follow. This app uses
 * `/ccx/api/v1/{tenant}` for it (Workday's long-published form for the Common
 * API); that prefix is NOT stated in any document reachable without a tenant.
 * It is isolated in `SERVICE_PATH.common` so one line fixes it if a tenant answers
 * otherwise. See the README.
 *
 * ## Shapes
 *
 *  - Collections: `{ "total": n, "data": [...] }`, paged by `limit` (default 20,
 *    max 100) and a zero-based `offset`.
 *  - Errors: `{ "error": "...", "errors": [{ "error", "field", "location" }] }`.
 *  - Resource references everywhere are `{ id, descriptor, href }`.
 *  - A path ID accepts a 32-hex Workday ID, a reference ID of the form `Type=Value`
 *    (`Employee_ID=21001`) and, for workers, the named entry `me`.
 */

export type Service = "common" | "staffing" | "absenceManagement" | "person" | "timeTracking";

export const SERVICE_PATH: Record<Service, string> = {
  common: "v1",
  staffing: "staffing/v7",
  absenceManagement: "absenceManagement/v5",
  person: "person/v4",
  timeTracking: "timeTracking/v7",
};

/**
 * `<label>(.<label>)*.workday.com` or `.myworkday.com`. At least one label ahead of
 * the suffix, so neither apex is accepted; labels are letters, digits and hyphens.
 */
const HOST_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:myworkday\.com|workday\.com)$/;

/** Workday tenant ids are letters, digits, underscore and hyphen. */
const TENANT_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export function normalizeHost(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) throw new Error("`host` is required, e.g. wd2-impl-services1.workday.com");
  if (!HOST_RE.test(raw)) {
    throw new Error(
      `\`host\` must be a bare Workday hostname ending in .workday.com or .myworkday.com ` +
        `(no scheme, port or path) — got ${JSON.stringify(raw.slice(0, 80))}`,
    );
  }
  return raw;
}

export function normalizeTenant(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error("`tenant` is required");
  if (!TENANT_RE.test(raw)) {
    throw new Error(
      "`tenant` may contain only letters, digits, underscore and hyphen — got " +
        JSON.stringify(raw.slice(0, 40)),
    );
  }
  return raw;
}

export interface Target {
  host: string;
  tenant: string;
}

export function targetFromConnection(connection: unknown): Target {
  const display = (connection as { display?: Record<string, unknown> } | undefined)?.display;
  if (!display?.host || !display?.tenant) {
    throw new Error("This connection has no Workday host/tenant — reconnect the Workday account");
  }
  return { host: normalizeHost(display.host), tenant: normalizeTenant(display.tenant) };
}

export function baseUrl(target: Target, service: Service): string {
  return `https://${target.host}/ccx/api/${SERVICE_PATH[service]}/${target.tenant}`;
}

export function tokenUrl(target: Target): string {
  return `https://${target.host}/ccx/oauth2/${target.tenant}/token`;
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.=-]{0,127}$/;

/** A validated ID: a Workday ID, a `Type=Value` reference ID, or `me`. Never a path. */
export function idValue(value: unknown, field: string): string {
  const id = String(value ?? "").trim();
  if (!id) throw new Error(`\`${field}\` is required`);
  if (!ID_RE.test(id)) {
    throw new Error(
      `\`${field}\` must be a Workday ID (32 hex characters), a reference ID like ` +
        `Employee_ID=21001, or \`me\` — got ${JSON.stringify(id.slice(0, 40))}`,
    );
  }
  return id;
}

/** `idValue`, percent-encoded for use as a path segment. */
export function pathId(value: unknown, field: string): string {
  return encodeURIComponent(idValue(value, field));
}

export type QueryValue = string | number | boolean | string[] | undefined | null;

/** Drop unset keys. `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** A list param given as an array or a comma/newline separated string. */
export function list(v: unknown): string[] | undefined {
  const items = Array.isArray(v)
    ? v.map((s) => String(s).trim())
    : typeof v === "string"
    ? v.split(/[,\n]/).map((s) => s.trim())
    : [];
  const kept = items.filter(Boolean);
  return kept.length ? kept : undefined;
}

/** `yyyy-mm-dd`, or undefined when unset. */
export function dateOnly(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || String(value).trim() === "") return undefined;
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) {
    throw new Error(
      `\`${field}\` must be a date as yyyy-mm-dd — got ${JSON.stringify(s.slice(0, 20))}`,
    );
  }
  return s;
}

/** Paging params: `limit` 1..100 and a non-negative integer `offset`. */
export function paging(input: { limit?: unknown; offset?: unknown }): Record<string, number> {
  const out: Record<string, number> = {};
  if (input.limit !== undefined && input.limit !== null && input.limit !== "") {
    const n = Number(input.limit);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      throw new Error("`limit` must be an integer from 1 to 100");
    }
    out.limit = n;
  }
  if (input.offset !== undefined && input.offset !== null && input.offset !== "") {
    const n = Number(input.offset);
    if (!Number.isInteger(n) || n < 0) throw new Error("`offset` must be an integer, 0 or more");
    out.offset = n;
  }
  return out;
}

/** Turn a failed response into a message naming which failure it was. */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as {
      error?: string;
      error_description?: string;
      errors?: Array<{ error?: string; field?: string; location?: string }>;
    };
    const fields = (body?.errors ?? [])
      .map((e) => [e.field ?? e.location, e.error].filter(Boolean).join(": "))
      .filter(Boolean).join("; ");
    detail = [body?.error ?? body?.error_description, fields].filter(Boolean).join(" — ") ||
      detail;
  } catch { /* empty or not JSON */ }

  if (status === 401) {
    return `${detail || "unauthorized"} — the access token was missing, invalid or expired. ` +
      "The runtime mints a new one from the refresh token; a persistent 401 means the API " +
      "client was deleted or its refresh token revoked, or the host/tenant do not match";
  }
  if (status === 403) {
    return `${detail || "forbidden"} — the Integration System User behind the API client lacks ` +
      "a domain security policy for this resource, or the API client lacks the functional-area " +
      "scope (see each action's description)";
  }
  if (status === 404) {
    return `${detail || "not found"} — a wrong ID, an ID the security policy hides, or a service ` +
      "version this tenant does not serve";
  }
  if (status === 429) return `${detail || "too many requests"} — back off and retry`;
  return detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
}

export class WorkdayClient {
  private target: Target;

  constructor(private ctx: HookContext, target?: Target) {
    this.target = target ?? targetFromConnection(ctx.connection);
  }

  /** Returns the parsed body, or `null` for an empty one. */
  async request<T = unknown>(
    service: Service,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${baseUrl(this.target, service)}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      for (const item of Array.isArray(v) ? v : [v]) url.searchParams.append(k, String(item));
    }
    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`Workday ${res.status}: ${describeError(res.status, text)}`);
    if (!text.trim()) return null as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Workday returned a non-JSON body: ${text.slice(0, 160)}`);
    }
  }
}

export interface Page {
  items: unknown[];
  total: number;
  count: number;
  hasMore: boolean;
}

/** Fold a `{ total, data }` collection into a page with an explicit `hasMore`. */
export function toPage(body: unknown, offset = 0): Page {
  const b = (body ?? {}) as { total?: unknown; data?: unknown };
  const items = Array.isArray(b.data) ? b.data : [];
  const total = typeof b.total === "number" ? b.total : items.length;
  return { items, total, count: items.length, hasMore: offset + items.length < total };
}
