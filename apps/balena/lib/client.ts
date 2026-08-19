import type { HookContext } from "@w6w/types";

/**
 * balenaCloud — the **v7** OData-ish API at `api.balena-cloud.com`, plus the
 * supervisor proxy. Built against balena's own resource documentation and
 * probed live on 2026-08-19.
 *
 * ## An unauthenticated request to `/application` returns 200
 *
 * This is the one to know. Measured live, with **no `Authorization` header at
 * all**:
 *
 *     GET /v7/application?$top=2
 *     → 200 {"d":[{"app_name":"internetspeedmonitor", …}, …]}
 *
 * Those are strangers' **public fleets**. balena's own documentation says as
 * much — "this will also include all public fleets of the platform" — but the
 * consequence in a workflow is sharper than the note suggests: a connection
 * whose credential has been revoked keeps returning a plausible list of
 * fleets, none of them yours, and never fails. `/device` correctly answers
 * 401, so the failure is silent on exactly the call people list first.
 *
 * `fleet-list` therefore scopes to the caller's own organizations and reports
 * anything public it had to discard.
 *
 * ## Fleets are called applications in the API
 *
 * balena renamed applications to *fleets* in the product. The API resource is
 * still `application`, the field on a device is still
 * `belongs_to__application`, and the dashboard says fleet throughout. Both
 * words mean the same thing; this app says fleet and sends `application`.
 *
 * ## OData, and a typo is a 500
 *
 * Queries are `$filter`, `$select`, `$expand`, `$top`, `$orderby`. Responses
 * are `{"d": [...]}` — the array is always under `d`.
 *
 * Measured: `$filter=nope eq 1` against an unknown field returns **HTTP 500**,
 * not 400. A misspelled field looks like balena having a bad day, so
 * `describeError` says so on any 500 carrying a filter.
 *
 * ## Two ids per device, and a uuid that is not a UUID
 *
 * A device has a numeric `id` and a 32-character hex `uuid` with no dashes —
 * not RFC 4122, and the dashboard shows a **short** 7-character form of it.
 * Pasting the short form into an exact-match filter finds nothing, which reads
 * as the device being gone.
 */

export const API = "https://api.balena-cloud.com";
export const VERSION = "v7";

export type QueryValue = string | number | boolean | undefined | null;

/** Drop keys the caller left unset. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Escape a string for an OData literal — the quote is doubled, not backslashed. */
export function odataString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Validate a device uuid.
 *
 * The full form is 32 or 62 hex characters. The dashboard displays the first
 * seven, and that short form does **not** match an equality filter — the
 * request succeeds and returns nothing, which is indistinguishable from a
 * device that has been removed.
 */
export function assertUuid(value: unknown, field = "uuid"): string {
  const uuid = String(value ?? "").trim().toLowerCase();
  if (!uuid) throw new Error(`\`${field}\` is required`);
  if (/^[0-9a-f]{32}$|^[0-9a-f]{62}$/.test(uuid)) return uuid;
  if (/^[0-9a-f]{4,31}$/.test(uuid)) {
    throw new Error(
      `\`${field}\` looks like the SHORT uuid the dashboard displays (${uuid}). balena matches ` +
        "the full 32-character value exactly, so the short form returns an empty result rather " +
        "than an error — which reads as the device having been removed. Take the full uuid from " +
        "`device-list` or from the device's summary page",
    );
  }
  throw new Error(
    `\`${field}\` must be a device uuid — 32 hex characters, no dashes. Note balena's uuid is ` +
      "not an RFC 4122 UUID, so anything with dashes in it is something else",
  );
}

/** The `status` values balena reports, and what each actually means. */
export const DEVICE_STATUS_MEANING: Record<string, string> = {
  idle: "online and running what it should be",
  configuring: "provisioning — it has connected and is not finished setting itself up",
  updating: "downloading or applying a release",
  "post-provisioning": "running its first-boot configuration",
  inactive: "deactivated in balena, and not billed",
  disconnected: "no heartbeat — the device is not reachable",
  "ordered-fleet": "ordered through balena and not yet provisioned",
};

/** Turn a balena error into something actionable. */
export function describeError(status: number, text: string, url?: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { message?: string; error?: { message?: string } };
    detail = body?.message ?? body?.error?.message ?? detail;
  } catch { /* balena often answers text/plain */ }

  if (status === 401) {
    return `${detail || "unauthorized"} — the credential was rejected. Note that balena answers ` +
      "200 to an UNAUTHENTICATED `/application` request, returning the platform's public " +
      "fleets, so a broken credential fails only on the calls that need one";
  }
  if (status === 403) {
    return `${detail || "forbidden"} — authenticated and not permitted. balena scopes access by ` +
      "organization membership and role, so a credential can list a fleet and be unable to " +
      "change it";
  }
  if (status === 404) {
    return `${detail || "not found"} — balena also returns an EMPTY LIST rather than a 404 for a ` +
      "filter that matches nothing, so a 404 here means the resource path itself is wrong";
  }
  if (status === 500 && url && url.includes("$filter")) {
    return `${detail || "server error"} — a 500 on a filtered query is usually a MISSPELLED ` +
      "FIELD NAME rather than an outage: balena's OData layer answers 500, not 400, for a " +
      "filter it cannot parse";
  }
  return detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** The supervisor proxy lives outside the versioned OData tree. */
  raw?: boolean;
  /** Several supervisor endpoints answer with bare text. */
  text?: boolean;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the credential — the runtime
 * routes every request through the auth `sign` hook.
 */
export class BalenaClient {
  constructor(private ctx: HookContext) {}

  /** An OData collection, unwrapped from `{ d: [...] }`. */
  async list<T = unknown>(
    resource: string,
    options: RequestOptions = {},
  ): Promise<T[]> {
    const body = await this.request<{ d?: T[] }>(`/${VERSION}/${resource}`, options);
    return body?.d ?? [];
  }

  /** The first row of an OData collection, or undefined. */
  async one<T = unknown>(resource: string, options: RequestOptions = {}): Promise<T | undefined> {
    return (await this.list<T>(resource, options))[0];
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: options.text ? "*/*" : "application/json",
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(
        `balena ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text, url.toString())
        }`,
      );
    }

    if (res.status === 204 || !text) return undefined as T;
    if (options.text) return text as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // The supervisor proxy answers a bare `OK` to some actions.
      return text as T;
    }
  }

  /**
   * The supervisor proxy: `POST /supervisor/<path>` with the device named in
   * the body. This is how a workflow reaches a device that is behind NAT with
   * no inbound access — balena's VPN carries the request, and the device has
   * to be *online* for it to arrive at all.
   */
  supervisor<T = unknown>(
    path: string,
    uuid: string,
    data?: Record<string, unknown>,
  ): Promise<T> {
    // Not `text: true`: the proxy answers JSON on most routes, a bare `OK` on
    // one, and an empty body on another. `request` parses what it can and
    // falls back to the text, which is what `supervisorAccepted` expects.
    return this.request<T>(`/supervisor${path}`, {
      method: "POST",
      body: compact({ uuid, data }),
    });
  }
}

/**
 * The supervisor's legacy response shape.
 *
 * balena kept `{"Data":"OK","Error":""}` — capital D, capital E — from an
 * implementation that was briefly rewritten in Go, for backwards
 * compatibility. A workflow checking `body.data` finds nothing; some routes
 * answer with a bare `OK` and others with an empty body.
 */
export function supervisorAccepted(response: unknown): boolean {
  if (response === undefined || response === null || response === "") return true;
  if (typeof response === "string") return /^\s*OK\s*$/i.test(response) || response === "";
  const body = response as { Data?: unknown; Error?: unknown };
  if (body?.Error) return false;
  return body?.Data === "OK" || body?.Data !== undefined;
}

/** Whatever the supervisor said went wrong, if anything. */
export function supervisorError(response: unknown): string | undefined {
  if (response && typeof response === "object") {
    const error = (response as { Error?: unknown }).Error;
    if (error) return String(error);
  }
  return undefined;
}
