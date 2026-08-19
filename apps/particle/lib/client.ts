import type { HookContext } from "@w6w/types";

/**
 * The Particle Device Cloud API — probed live against `api.particle.io` on
 * 2026-08-19.
 *
 * ## This app talks to devices, not to a database
 *
 * That is what makes `iot` different from every other slug here. A request to
 * read a variable or call a function is **forwarded to a physical device over
 * its own connection** — cellular, Wi-Fi or Ethernet — and waits for it to
 * answer. So the failure modes are not the API's: a device asleep, out of
 * coverage, or running firmware that does not declare the function being
 * called.
 *
 * A `connected: false` device is not an error condition. It is a battery
 * powered sensor doing what it was designed to do, and a workflow that treats
 * it as one will page somebody at 3am about a device behaving correctly. Every
 * action that reaches a device checks first and says so.
 *
 * ## No credential at all is a 400, not a 401
 *
 * Measured:
 *
 * | Request | Status | Body |
 * | --- | --- | --- |
 * | no token | **400** | `invalid_request` — "The access token was not found" |
 * | bad token | 401 | `invalid_token` — "The access token provided is invalid" |
 * | somebody else's device | 403 | — |
 *
 * So a missing credential presents as a malformed *request* rather than an
 * authentication problem, which is the opposite of where anyone would look.
 *
 * ## The function argument limit is not one number
 *
 * Particle's own documentation: the argument "has a maximum size of 64 to 1024
 * bytes of UTF-8 characters … the limit varies depending on Device OS version
 * and sometimes the device". So the same call can succeed against one device
 * and fail against another running older firmware, with nothing in the
 * workflow different. This app enforces the 1024 ceiling and says the effective
 * limit may be far lower.
 */

export const API_HOST = "https://api.particle.io";

/** Particle's own hard ceiling. The effective limit is device-dependent. */
export const MAX_FUNCTION_ARG_BYTES = 1024;

/** Event names are capped, and a longer one is rejected rather than truncated. */
export const MAX_EVENT_NAME_BYTES = 64;

/** Event payloads are capped too. */
export const MAX_EVENT_DATA_BYTES = 1024;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Form-encoded, which is what most of this API takes. */
  form?: Record<string, string | number | boolean | undefined>;
  /** JSON, for the endpoints that want it. */
  body?: unknown;
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
 * A device id — 24 hexadecimal characters.
 *
 * Checked here because Particle accepts a device *name* on some paths and not
 * on others, and the failure when it does not is a 404 that looks like the
 * device having been deleted. Names are also not unique across an account in
 * the way ids are.
 */
export function deviceId(value: unknown, field = "deviceId"): string {
  const id = String(value ?? "").trim();
  if (!id) throw new Error(`\`${field}\` is required`);
  if (!/^[0-9a-f]{24}$/i.test(id)) {
    throw new Error(
      `\`${field}\` should be a 24-character hexadecimal device id — got "${id}". Particle ` +
        "accepts a device NAME on some paths and not others, and where it does not the failure " +
        "is a 404 that looks like a deleted device. `device-list` reports the ids",
    );
  }
  return id.toLowerCase();
}

/** Bytes, not characters — every Particle limit is in bytes of UTF-8. */
export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the token — the runtime routes
 * every request through the auth `sign` hook.
 */
export class ParticleClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_HOST}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };

    if (options.form) {
      // Most of this API predates JSON bodies and takes form encoding.
      headers["content-type"] = "application/x-www-form-urlencoded";
      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(options.form)) {
        if (v === undefined) continue;
        form.set(k, String(v));
      }
      init.body = form.toString();
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Particle ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Particle did not return JSON: ${text.slice(0, 160)}`);
    }
  }
}

/**
 * Turn a Particle error into something actionable.
 *
 * The shape is OAuth-flavoured — `{"error": "...", "error_description": "..."}`
 * — for authentication problems, and `{"error": "...", "ok": false}` for device
 * ones. The device errors are the interesting half, because they are about
 * hardware rather than about the request.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  let code = "";
  try {
    const body = JSON.parse(text) as {
      error?: string;
      error_description?: string;
      info?: string;
    };
    code = String(body?.error ?? "");
    detail = body?.error_description || body?.info || body?.error || detail;
  } catch { /* not JSON */ }

  if (status === 400 && code === "invalid_request") {
    return `${detail} — this is a MISSING credential rather than a malformed request: Particle ` +
      "answers 400 when no access token is supplied at all, and 401 only when one is supplied " +
      "and rejected";
  }
  if (status === 401) {
    return `${detail} — the access token was rejected. Particle tokens expire: a user token ` +
      "created without an explicit lifetime lasts 90 days, so a workflow that worked for months " +
      "can stop for this reason alone";
  }
  if (status === 403) {
    return `${detail} — the token is valid and does not own this device. A device belongs to one ` +
      "account or one product, and claiming it elsewhere does not grant access here";
  }
  if (status === 404) {
    return `${detail} — not found. A device id is 24 hex characters; a device NAME works on some ` +
      "paths and not others, and where it does not this is what you get";
  }
  if (status === 408 || /timed out/i.test(detail)) {
    return `${detail} — the DEVICE did not answer in time, which is the device rather than the ` +
      "API: asleep, out of coverage, or busy. `device-get` reports `connected` and `last_heard`, " +
      "and an offline device is often working exactly as designed";
  }
  if (status === 429) {
    return `${detail} — rate limited. Particle limits per endpoint and publishes no headers, so ` +
      "there is nothing to read ahead of time";
  }
  if (status >= 500) {
    return `${detail} — Particle's own error. Worth distinguishing: a device that cannot be ` +
      "reached usually produces a 4xx, so a 5xx here is the cloud rather than the hardware";
  }
  return detail || `${status}`;
}
