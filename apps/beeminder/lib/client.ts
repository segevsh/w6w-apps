import type { HookContext } from "@w6w/types";

/**
 * Beeminder API v1. Verified 2026-10-06 against https://api.beeminder.com/ (the vendor's
 * single-page reference) plus live unauthenticated probes of www.beeminder.com.
 *
 * ## One host, one credential, two error shapes
 *
 * Every call goes to `https://www.beeminder.com/api/v1`. The personal token is added as the
 * `auth_token` query parameter by the Auth `sign` hook; nothing in this file sees it.
 * The vendor warns the base must be exactly this (https, with `www`): the http / apex hosts
 * redirect and a redirect drops POST parameters.
 *
 * Errors come in two shapes (both measured live): auth failures are
 * `{"errors":{"message":"…","token":"no_token"}}` / `{"errors":{"auth_token":"bad_token",…}}`
 * (object), most validation failures are `{"errors":"…"}` (string), and an unknown path is
 * `404 {"error":"The requested resource was not found."}` (singular).
 *
 * ## Writes
 *
 * Simple writes are form-encoded exactly like the reference's curl examples. Goal create /
 * update carry arrays (`tags`, `roadall`) and explicit nulls, so they are sent as JSON.
 * Neither encoding could be exercised against a live token while building this app.
 */
export const API_HOST = "www.beeminder.com";
export const API_BASE = `https://${API_HOST}/api/v1`;

type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, Scalar>;
  /** Form-encoded body (`application/x-www-form-urlencoded`). */
  form?: Record<string, Scalar>;
  /** JSON body. */
  json?: unknown;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

/** The vendor's error out of a body: `errors` (string | object) or the singular `error`. */
export function vendorErrors(raw: unknown): unknown {
  if (raw && typeof raw === "object") {
    const r = raw as { errors?: unknown; error?: unknown };
    return r.errors ?? r.error;
  }
  return undefined;
}

export function errorText(errors: unknown): string {
  if (typeof errors === "string") return errors;
  if (errors && typeof errors === "object") {
    const e = errors as Record<string, unknown>;
    if (typeof e.message === "string") return e.message;
    return JSON.stringify(errors);
  }
  return "";
}

export function formatError(
  status: number,
  method: string,
  path: string,
  body: unknown,
  raw: string,
): string {
  const text = errorText(vendorErrors(body)) || raw.trim();
  const hint = status === 401
    ? " — the personal token was rejected; copy it again from your Beeminder API token page"
    : status === 404
    ? " — no such user, goal or datapoint (check the username and the goal slug)"
    : status === 503
    ? " — Beeminder is down for maintenance"
    : "";
  return truncate(`Beeminder ${status} for ${method} ${path}: ${text}${hint}`, 1000);
}

export class BeeminderError extends Error {
  constructor(message: string, public httpStatus: number, public details?: unknown) {
    super(message);
    this.name = "BeeminderError";
  }
}

export interface ApiResult {
  status: number;
  /** Parsed JSON body (an object, array or `true`), or the raw text. */
  data: unknown;
}

export class BeeminderClient {
  constructor(private ctx: HookContext) {}

  async request(path: string, options: RequestOptions = {}): Promise<ApiResult> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const hasBody = options.json !== undefined || options.form !== undefined;
    const method = options.method ?? (hasBody ? "POST" : "GET");
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.json !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.json);
    } else if (options.form !== undefined) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = formEncode(options.form);
    }
    // No credential here: the Auth `sign` hook adds it.
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch { /* non-JSON */ }

    if (!res.ok) {
      throw new BeeminderError(
        formatError(res.status, method, url.pathname, data, typeof data === "string" ? data : ""),
        res.status,
        vendorErrors(data),
      );
    }
    return { status: res.status, data };
  }
}

/** `application/x-www-form-urlencoded`, dropping undefined/null members. */
export function formEncode(form: Record<string, Scalar>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(form)) {
    if (v === undefined || v === null) continue;
    p.set(k, String(v));
  }
  return p.toString();
}

/** Drop `undefined` members (keeps `null`, which Beeminder reads as "unset"). */
export function defined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

const seg = (v: unknown, name: string): string => {
  const s = String(v ?? "").trim();
  if (!s) throw new Error(`${name} is required`);
  return encodeURIComponent(s);
};

/** `/users/<u>` — `me` is the vendor's macro for the token's own user. */
export function userPath(username?: string): string {
  return `/users/${seg(username?.toString().trim() || "me", "username")}`;
}

export function goalPath(username: string | undefined, slug: string): string {
  return `${userPath(username)}/goals/${seg(slug, "slug")}`;
}

export function datapointPath(username: string | undefined, slug: string, id: string): string {
  return `${goalPath(username, slug)}/datapoints/${seg(id, "id")}`;
}

export function splitList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value ?? "").split(/[\s,;]+/).map((v) => v.trim()).filter(Boolean);
}

type Rec = Record<string, unknown>;

/** The goal fields workflows reach for, plus the full vendor object under `goal`. */
export function mapGoal(data: unknown): Rec {
  const g = (data ?? {}) as Rec;
  return {
    slug: g.slug,
    title: g.title,
    goalType: g.goal_type,
    goalUnits: g.gunits,
    goalDate: g.goaldate,
    goalValue: g.goalval,
    rate: g.rate,
    rateUnits: g.runits,
    loseDate: g.losedate,
    safeDays: g.safebuf,
    pledge: g.pledge,
    limitSummary: g.limsum,
    graphUrl: g.graph_url,
    frozen: g.frozen,
    queued: g.queued,
    updatedAt: g.updated_at,
    goal: g,
  };
}

export function mapDatapoint(data: unknown): Rec {
  const d = (data ?? {}) as Rec;
  return {
    id: d.id,
    timestamp: d.timestamp,
    daystamp: d.daystamp,
    value: d.value,
    comment: d.comment,
    requestId: d.requestid,
    updatedAt: d.updated_at,
  };
}
