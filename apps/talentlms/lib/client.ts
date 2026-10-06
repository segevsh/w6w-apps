import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * TalentLMS gives every account its own host — `acme.talentlms.com` — and
 * serves the v1 API from `/api/v1` on it.
 *
 *   - `w6w.network.allow` declares `*.talentlms.com`; the runtime's egress
 *     matcher accepts any subdomain and still refuses everything else.
 *   - the subdomain is an Auth field, recorded on the Connection by
 *     `afterConnect`; this module reads it back from the redacted `display`,
 *     so a client can address the right host without ever seeing a credential.
 */
export function domainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { domain?: string };
  if (display.domain) return display.domain;
  throw new Error(
    "TalentLMS connection has no domain — reconnect the account so it can be recorded.",
  );
}

export function baseUrl(domain: string): string {
  return `https://${domain}.talentlms.com/api/v1`;
}

export type Scalar = string | number | boolean | undefined | null;

/** A blank form field is treated as absent. */
function present(v: Scalar): v is string | number | boolean {
  return v !== undefined && v !== null && v !== "";
}

/**
 * Encode one path-argument value. Commas separate arguments and colons separate
 * a key from its value, so both are escaped; `@` is left alone because the
 * reference's own email lookups carry it bare.
 */
export function encodeArg(v: string | number | boolean): string {
  return encodeURIComponent(String(v)).replace(/%40/g, "@");
}

/**
 * The reference's argument syntax: `key:value,key:value`, appended to the
 * endpoint as one path segment (`/v1/getuserstatusincourse/course_id:4,user_id:7`).
 */
export function pathArgs(args: Record<string, Scalar>): string {
  return Object.entries(args)
    .filter(([, v]) => present(v))
    .map(([k, v]) => `${k}:${encodeArg(v as string | number | boolean)}`)
    .join(",");
}

/** `true`/`false` to the vendor's own wording (`on`/`off`, `yes`/`no`); unset stays unset. */
export function flag(v: boolean | undefined, on: string, off: string): string | undefined {
  return v === undefined ? undefined : v ? on : off;
}

/**
 * Flatten a "Custom fields" param into the `custom_field_N` keys the API takes.
 * Accepts `{ "3": "x" }` or `{ "custom_field_3": "x" }`, as an object or a JSON string.
 */
export function customFieldPairs(raw: unknown): Record<string, Scalar> {
  if (raw === undefined || raw === null || raw === "") return {};
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error('`customFields` must be a JSON object, e.g. { "1": "Sales" }.');
  }
  const out: Record<string, Scalar> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    out[/^\d+$/.test(k) ? `custom_field_${k}` : k] = v as Scalar;
  }
  return out;
}

/** TalentLMS errors are `{ "error": { "type", "message" } }`; fall back to the raw text. */
export function errorDetail(text: string): string {
  try {
    const body = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
    if (typeof body.error === "string") return body.error;
    return body.error?.message ?? body.message ?? text;
  } catch {
    return text;
  }
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class TalentLmsClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(domainFromConnection(ctx.connection));
  }

  /** Lookups and one-line mutations: arguments ride in the path. */
  get<T = unknown>(endpoint: string, args: Record<string, Scalar> = {}): Promise<T> {
    const tail = pathArgs(args);
    return this.send<T>(`${this.base}/${endpoint}${tail ? `/${tail}` : ""}`, { method: "GET" });
  }

  /** Create / edit / delete: the endpoint is bare and the fields go in the body, form-encoded. */
  post<T = unknown>(endpoint: string, fields: Record<string, Scalar>): Promise<T> {
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) if (present(v)) form.set(k, String(v));
    return this.send<T>(`${this.base}/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
  }

  private async send<T>(url: string, init: RequestInit): Promise<T> {
    const res = await this.ctx.fetch(url, {
      ...init,
      headers: { accept: "application/json", ...(init.headers as Record<string, string>) },
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `TalentLMS ${res.status} ${res.statusText} for ${init.method} ${new URL(url).pathname}: ${
          errorDetail(text)
        }`,
      );
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
