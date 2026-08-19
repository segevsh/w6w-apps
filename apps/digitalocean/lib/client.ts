import type { HookContext } from "@w6w/types";

/**
 * The DigitalOcean API v2 — probed live against `api.digitalocean.com` on
 * 2026-08-19.
 *
 * ## Everything here bills by the hour until it is destroyed
 *
 * That is the theme this app is built around, because DigitalOcean's billing
 * model has three specific consequences that surprise people, and none of them
 * is visible in an API response:
 *
 * - **A powered-off droplet still bills.** Turning a droplet off stops it doing
 *   anything and does not stop the invoice — the disk and the reservation are
 *   still held. Destroying it is what stops the charge, and "power it off over
 *   the weekend to save money" saves nothing.
 * - **Destroying a droplet does not destroy its volumes or its snapshots.**
 *   They outlive it, keep billing, and are no longer attached to anything that
 *   would remind you they exist. This is the most common way a DigitalOcean
 *   bill grows without anybody adding anything.
 * - **A reserved IP bills while it is NOT assigned.** The charge is for holding
 *   an address out of the pool, so an unassigned one — exactly the state that
 *   looks unused — is the one that costs.
 *
 * Every action here that creates, destroys or powers something reports what it
 * does and does not stop paying for.
 *
 * ## Actions are asynchronous, and a 201 is not a finished thing
 *
 * Creating a droplet, resizing it, or taking a snapshot returns an **action**
 * object with `status: "in-progress"`. The droplet exists in the API and is not
 * usable yet, so a workflow that creates and then connects fails on the second
 * step. Actions that behave this way return the action id and say so.
 *
 * ## Pagination is in `links.pages`, and `meta.total` is the real count
 *
 * A response's array is one page, defaulting to 20. `meta.total` is how many
 * there are, and a workflow that counts the array is counting the page.
 */

export const API_HOST = "https://api.digitalocean.com";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** A page of results, with the shape DigitalOcean wraps everything in. */
export interface Page<T> {
  items: T[];
  total?: number;
  nextPage?: string;
}

/** Drop keys the caller left unset, so a default is not overwritten with nothing. */
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

/** Coerce a params bag into query values, dropping what was left unset. */
export function query(input: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "boolean" || typeof v === "number" ? v : String(v);
  }
  return out;
}

/**
 * A numeric resource id.
 *
 * Droplets, images and snapshots of droplets are numbers; volumes, databases
 * and load balancers are UUIDs. Mixing them up produces a 404 rather than a
 * type error, so the shape is checked where it is known.
 */
export function numericId(value: unknown, field: string): number {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error(`\`${field}\` is required`);
  if (!/^\d+$/.test(raw)) {
    throw new Error(
      `\`${field}\` must be a numeric id — got "${raw}". DigitalOcean identifies droplets and ` +
        "images by number and volumes, databases and load balancers by UUID, and using one " +
        "where the other belongs is a 404 rather than a validation error",
    );
  }
  return Number(raw);
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the token — the runtime routes
 * every request through the auth `sign` hook.
 */
export class DigitalOceanClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return (await this.full<T>(path, options)).body;
  }

  /** The same, keeping the rate-limit headers. */
  async full<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ body: T; rateLimit: RateLimit; status: number }> {
    const url = new URL(`${API_HOST}${path}`);
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
    const text = await res.text().catch(() => "");
    const rateLimit = parseRateLimit(res.headers);

    if (!res.ok) {
      throw new Error(
        `DigitalOcean ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) {
      return { body: undefined as T, rateLimit, status: res.status };
    }
    try {
      return { body: JSON.parse(text) as T, rateLimit, status: res.status };
    } catch {
      throw new Error(`DigitalOcean did not return JSON: ${text.slice(0, 160)}`);
    }
  }

  /**
   * A paginated read, unwrapped.
   *
   * The array under `key` is one page; `meta.total` is how many exist. A
   * workflow counting the array is counting the page.
   */
  async list<T>(
    path: string,
    key: string,
    options: RequestOptions = {},
  ): Promise<Page<T>> {
    const body = await this.request<
      Record<string, unknown> & {
        meta?: { total?: number };
        links?: { pages?: { next?: string } };
      }
    >(path, options);
    const items = body?.[key];
    return {
      items: Array.isArray(items) ? items as T[] : [],
      total: typeof body?.meta?.total === "number" ? body.meta.total : undefined,
      nextPage: body?.links?.pages?.next,
    };
  }
}

/**
 * What the rate-limit headers said.
 *
 * DigitalOcean documents 5,000 requests an hour and reports it in
 * `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset`. Note the
 * headers are **absent on an unauthenticated 401** — verified — so a failed
 * connection tells you nothing about headroom.
 */
export interface RateLimit {
  limit?: number;
  remaining?: number;
  /** Unix seconds, unlike most of this pack, where it is a duration. */
  resetsAt?: number;
}

export function parseRateLimit(headers: Headers): RateLimit {
  const num = (name: string) => {
    const raw = headers.get(name);
    if (raw === null) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };
  return {
    limit: num("ratelimit-limit"),
    remaining: num("ratelimit-remaining"),
    // Seconds since the epoch, not seconds from now.
    resetsAt: num("ratelimit-reset"),
  };
}

/**
 * Turn a DigitalOcean error into something actionable.
 *
 * The shape is `{"id": "unauthorized", "message": "…", "request_id": "…"}` —
 * the `id` is the machine-readable half and the `request_id` is what support
 * asks for.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  let id = "";
  let requestId = "";
  try {
    const body = JSON.parse(text) as { id?: string; message?: string; request_id?: string };
    id = String(body?.id ?? "");
    detail = body?.message || detail;
    requestId = String(body?.request_id ?? "");
  } catch { /* not JSON */ }
  const tail = `${id ? ` [${id}]` : ""}${requestId ? ` (request ${requestId})` : ""}`;

  if (status === 401) {
    return `${detail}${tail} — the token was not accepted. DigitalOcean tokens can be scoped ` +
      "read-only, and one of those authenticates and fails every write with a 403 rather than " +
      "a 401";
  }
  if (status === 403) {
    return `${detail}${tail} — authenticated and not permitted. A READ-ONLY token looks exactly ` +
      "like a working one until the first write";
  }
  if (status === 404) {
    return `${detail}${tail} — not found. Droplets and images are numeric ids while volumes, ` +
      "databases and load balancers are UUIDs, and using one shape where the other belongs " +
      "produces this rather than a validation error";
  }
  if (status === 422) {
    return `${detail}${tail} — the request was understood and rejected. A droplet size or region ` +
      "that is not available to this account looks like this, and availability differs by " +
      "account and by region";
  }
  if (status === 429) {
    return `${detail}${tail} — rate limited. DigitalOcean allows 5,000 requests an hour, and ` +
      "`RateLimit-Reset` is a Unix TIMESTAMP rather than a number of seconds to wait";
  }
  return `${detail}${tail}` || `${status}`;
}
