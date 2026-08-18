import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * JumpCloud's REST API — verified against the OpenAPI documents JumpCloud
 * serves from its own docs host (`docs.jumpcloud.com/api/1.0/index.yaml`,
 * 366KB, and `.../api/2.0/index.yaml`, 2.8MB; both fetched 2026-08-18).
 *
 * **There are two APIs, on two base paths, and this app uses both.** V1
 * (`/api`) owns users, devices and commands; V2 (`/api/v2`) owns groups and
 * their membership graph. They are not versions of each other — V2 did not
 * replace V1, and a user still lives at `/api/systemusers/{id}` while the group
 * they belong to lives at `/api/v2/usergroups/{id}`. Every action here names
 * which one it is on.
 */

/** The three regions JumpCloud runs, from the specs' `servers` blocks. */
export const REGIONS = {
  us: "console.jumpcloud.com",
  eu: "console.eu.jumpcloud.com",
  in: "console.in.jumpcloud.com",
} as const;

export type Region = keyof typeof REGIONS;

/** Public (redacted-safe) connection metadata. */
export interface JumpCloudConnectionDisplay {
  /** Which regional console this connection's tenant lives in. */
  region?: Region;
  /** The MSP-managed organization these calls act on, when one was named. */
  orgId?: string;
  /** The organization's display name, for the connection label. */
  orgName?: string;
}

/**
 * Resolve the region host.
 *
 * A key issued in the EU console does not work against the US one and vice
 * versa, so this is a connection field rather than something guessed. `us` is
 * the default because it is the default console and the spec lists it first.
 */
export function resolveRegion(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as JumpCloudConnectionDisplay;
  const region = String(display.region ?? "us").trim().toLowerCase();
  return (region in REGIONS ? region : "us") as Region;
}

export function hostFor(region: Region): string {
  return REGIONS[region];
}

/** The V1 base for a region: users, devices, commands. */
export function apiUrl(region: Region): string {
  return `https://${hostFor(region)}/api`;
}

/** The V2 base for a region: groups and the membership graph. */
export function apiV2Url(region: Region): string {
  return `https://${hostFor(region)}/api/v2`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
  /** `v2` puts the call on `/api/v2`. Defaults to V1. */
  api?: "v1" | "v2";
}

/** Drop keys the caller left unset so a PUT does not clear untouched fields. */
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

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * JumpCloud's list fields are **space**-separated, not comma-separated — `sort`
 * and `fields` both. Comma-separating them is not an error; it is a single
 * field name with commas in it, which JumpCloud ignores, so the call succeeds
 * and quietly returns everything unsorted. Forms are comma-separated
 * everywhere else in this pack, so the conversion happens here.
 */
export function spaced(v: unknown): string | undefined {
  const items = csv(v);
  return items ? items.join(" ") : undefined;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the API key — the runtime routes
 * every request through the auth `sign` hook.
 */
export class JumpCloudClient {
  readonly region: Region;

  constructor(private ctx: HookContext) {
    this.region = resolveRegion(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const base = options.api === "v2" ? apiV2Url(this.region) : apiUrl(this.region);
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = {
      method: options.method ?? "GET",
      headers,
      // See `assertNotLoginPage` — an unauthenticated call is answered with a
      // 302 to the login page, and following it turns a failure into a 200.
      redirect: "manual",
    };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    assertNotLoginPage(res, url);
    if (!res.ok) {
      // JumpCloud's error envelope is `{"error": "...", "message": "..."}`;
      // `message` is the useful half ("api key user not found"), so both are
      // surfaced verbatim.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `JumpCloud ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow JumpCloud's `limit`/`skip` offset pagination.
   *
   * The two APIs disagree on the envelope, and the disagreement is silent. V1
   * list endpoints answer `{results: [...], totalCount: n}`; V2 endpoints
   * (`/usergroups`, `/systemgroups`, `/usergroups/{id}/members`) answer a
   * **bare array** with no envelope and no declared total. An app that knew
   * only one shape would return an empty list from half its own endpoints
   * without erroring, so both are handled here.
   *
   * `limit` is capped at 100 by JumpCloud regardless of what you ask for, so
   * the page size is clamped here rather than discovered by the caller.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let skip = 0;
    while (items.length < wantTotal) {
      const limit = Math.min(100, Math.max(1, wantTotal - items.length));
      const page = await this.request<unknown>(path, {
        ...options,
        query: { ...options.query, limit, skip },
      });
      const chunk = Array.isArray(page)
        ? page as T[]
        : ((page as { results?: T[] } | undefined)?.results ?? []);
      items.push(...chunk);
      // A short page is the last page: JumpCloud does not send a next cursor.
      if (chunk.length < limit) break;
      skip += chunk.length;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}

/**
 * Turn JumpCloud's "helpful" redirect back into the failure it is.
 *
 * Measured 2026-08-18, a request to `console.jumpcloud.com/api/systemusers`
 * **with no `x-api-key` at all** answers `302` with `location: /login` — not
 * `401`. A wrong key answers a proper `401` with a JSON envelope; a *missing*
 * one does not.
 *
 * That matters because `fetch` follows redirects by default, so the naive
 * client ends up with `200 text/html`, the JumpCloud login page, and
 * `res.ok === true`. The request then fails at `JSON.parse` with a syntax error
 * about `<!DOCTYPE`, which reads like a JumpCloud bug rather than a missing
 * credential.
 *
 * So requests are made with `redirect: "manual"` and any 3xx toward a login
 * page is reported as what it is.
 */
export function assertNotLoginPage(res: Response, url: URL): void {
  if (res.status < 300 || res.status >= 400) return;
  const location = res.headers.get("location") ?? "";
  throw new Error(
    `JumpCloud ${res.status} for ${url.pathname}: redirected to "${location}" — this is what ` +
      "the API does when no api key reaches it, not a real redirect. Check the Connection.",
  );
}
