import type { HookContext, RedactedConnection } from "@w6w/types";
import { REGIONS } from "./regions.ts";

/**
 * Zoho People REST API client.
 *
 * Paths, verbs, parameters and response shapes were verified on 2026-10-06
 * against Zoho's own docs (`https://www.zoho.com/people/api/` — overview,
 * oauth-steps, scopes, bulk-records, fetch-record, insert-records,
 * update-records, fetch-forms, get-field-forms, fetch-view, add-leave,
 * leave-types, cancel-leave, holiday, attendance-entries,
 * attendance-checkin-checkout, timesheet/get-{timelogs,jobs,projects,
 * timesheets}, timesheet/add-timelogs) and live unauthenticated probes of all
 * ten regional hosts.
 *
 * ## There is no single response envelope
 *
 * Zoho People grew in layers and each layer answers differently:
 *
 *  - Forms/leave/timetracker: `{"response":{"result":...,"message":...,"status":0}}`
 *    (`status` is 0 on success, 1 on error).
 *  - Fetch Record (by view) and Attendance Entries answer a BARE array / object
 *    with no `response` wrapper at all.
 *  - The newer `/api/v2/...` family (Cancel Leave) answers
 *    `{"message","status":"success"}` and errors as `{"error":{"code","message"}}`
 *    with no `response` wrapper.
 *
 * {@link unwrap} normalises the success side; {@link errorMessage} the failure side,
 * which also covers `errors` being an object in one family and an array in another.
 */

/** The default (United States) API host, used only where no connection/region is known yet. */
export const DEFAULT_API_HOST = REGIONS.find((r) => r.key === "us")!.apiHost;

/** The API host recorded on the connection by `auth/oauth2.ts#afterConnect`. */
export function apiHostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiHost?: string };
  return display.apiHost || DEFAULT_API_HOST;
}

/** A form link name / view name is an identifier, not free text. */
export function identifier(name: unknown, what = "form link name"): string {
  const s = String(name ?? "").trim();
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(s)) {
    throw new Error(`\`${s}\` is not a valid Zoho People ${what} (letters, digits, underscores).`);
  }
  return s;
}

type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, Scalar>;
  /** Sent as an `application/x-www-form-urlencoded` body (how insert/update take `inputData`). */
  form?: Record<string, Scalar>;
}

interface PeopleErrorEntry {
  code?: number | string;
  message?: string;
}

/** Pull the vendor's own error `code` + message out of any of the three error shapes. */
export function errorDetail(raw: string): { code?: string; message?: string } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const p = parsed as {
    response?: { errors?: PeopleErrorEntry | PeopleErrorEntry[]; message?: string };
    error?: PeopleErrorEntry;
    message?: string;
  };
  const errs = p?.response?.errors ?? p?.error;
  const first = Array.isArray(errs) ? errs[0] : errs;
  if (first?.message || first?.code !== undefined) {
    return {
      code: first.code === undefined ? undefined : String(first.code),
      message: first.message,
    };
  }
  const message = p?.response?.message ?? p?.message;
  return message ? { message } : null;
}

/** One actionable line for a Zoho People failure. */
export function formatPeopleError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const d = errorDetail(raw);
  if (!d?.message) {
    const t = raw.length > 600 ? `${raw.slice(0, 600)}… (${raw.length} bytes)` : raw;
    return `Zoho People ${status} for ${method} ${path}: ${t}`;
  }
  return `Zoho People ${status}${d.code ? ` (${d.code})` : ""} for ${method} ${path}: ${d.message}`;
}

/** Thin wrapper over `ctx.fetch`; never sets Authorization (the auth `sign` hook does). */
export class ZohoPeopleClient {
  private host: string;

  constructor(private ctx: HookContext) {
    this.host = apiHostFromConnection(ctx.connection);
  }

  /** `path` is absolute from the host root, e.g. `/people/api/forms`. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`https://${this.host}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const method = options.method ?? "GET";
    const init: RequestInit = { method, headers };
    if (options.form) {
      const body = new URLSearchParams();
      for (const [k, v] of Object.entries(options.form)) {
        if (v === undefined || v === null || v === "") continue;
        body.set(k, String(v));
      }
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = body.toString();
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) throw new Error(formatPeopleError(res.status, method, url.pathname, text));

    if (!text) return undefined as T;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // A few legacy endpoints (attendance check-in) answer plain text.
      return text as T;
    }
    // Zoho People can report a failure inside a 2xx: `response.status === 1`.
    const wrapped = parsed as { response?: { status?: number } };
    if (wrapped?.response?.status === 1) {
      throw new Error(formatPeopleError(res.status, method, url.pathname, text));
    }
    return parsed as T;
  }
}

export interface Unwrapped<R = unknown> {
  result: R;
  message?: string;
}

/** Normalise the success side of the three envelope shapes — see the file header. */
export function unwrap<R = unknown>(body: unknown): Unwrapped<R> {
  const b = body as { response?: { result?: R; message?: string }; message?: string } | undefined;
  if (b && typeof b === "object" && !Array.isArray(b) && b.response) {
    return { result: (b.response.result ?? null) as R, message: b.response.message };
  }
  if (b && typeof b === "object" && !Array.isArray(b) && typeof b.message === "string") {
    return { result: body as R, message: b.message };
  }
  return { result: (body ?? null) as R };
}

/**
 * Get Bulk Records answers `result: [{"<recordId>": [ {fields...} ]}]` — each
 * array element is an object keyed by the record id. Flatten to
 * `[{recordId, ...fields}]`.
 */
export function flattenBulkRecords(result: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(result)) return [];
  const out: Array<Record<string, unknown>> = [];
  for (const item of result) {
    if (!item || typeof item !== "object") continue;
    for (const [recordId, rows] of Object.entries(item as Record<string, unknown>)) {
      const list = Array.isArray(rows) ? rows : [rows];
      for (const row of list) {
        out.push({ recordId, ...(row as Record<string, unknown>) });
      }
    }
  }
  return out;
}

/** Parse a JSON-object param (a string or an already-parsed object). */
export function jsonObject(raw: unknown, paramName: string): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") {
    throw new Error(`\`${paramName}\` is required and must be a JSON object.`);
  }
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}
