import type { HookContext } from "@w6w/types";

/**
 * KlickTipp's API — verified against the vendor's own OpenAPI documents and
 * guides at https://developers.klicktipp.com (fetched 2026-10-06):
 * `_bundle/management-api.yaml` (18 paths), `_bundle/listbuilding-api.yaml`
 * (3 paths), and the guides on authentication, error handling and the
 * listbuilding API. The German handbook that older integrations cite is gone;
 * developers.klicktipp.com is the only reference.
 *
 * One host, no tenant-specific base URL: `https://api.klicktipp.com`.
 *
 * ## Errors are classified from the body, not the status
 *
 * Business rejections are HTTP 406 with `{ "error": <code>, "error_message":
 * <German text> }` (a nested `code` subcode on `error: 10`); auth/permission
 * failures are 400/401/403 with a bare array of strings (`["API access
 * denied."]`). The `error_message` is localised German, so the numeric code is
 * mapped to English from the vendor's published table below.
 *
 * A successful write answers `[true]`, a successful create answers `[<id>]`.
 */
export const BASE_URL = "https://api.klicktipp.com";

/** The error-code table from the vendor's "Error Handling and Validation" guide. */
export const ERROR_CODES: Record<number, string> = {
  4: "the email address is unsubscribed; re-subscription is not allowed",
  5: "invalid email address",
  6: "the confirmation email could not be sent",
  7: "email address not found, or invalid field format such as an incorrect timestamp",
  8: "invalid value in a custom field",
  9: "the contact is not subscribed",
  10: "contact update failed",
  12: "internal error",
  30: "the email address is blocked and cannot be used for subscriptions",
  31: "smart tags can only be assigned automatically by the system",
  32: "either an email address or an SMS number must be provided",
  100: "invalid API key",
  401: "contact not found",
  402: "opt-in process not found",
  403: "tag not found",
  507: "the email address is already assigned to another contact",
};

/** Subcodes documented for `error: 10` (contact update failed). */
export const UPDATE_SUBCODES: Record<number, string> = {
  5: "invalid email address",
  6: "confirmation email could not be sent",
  9: "the SMS number is already assigned to another contact",
  10: "the SMS number is unsubscribed and cannot be re-subscribed",
  11: "invalid phone number",
  30: "the email address is blocked",
};

export class KlickTippError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
  ) {
    super(message);
    this.name = "KlickTippError";
  }
}

/** Parse a response body as JSON; `undefined` when it is empty or not JSON. */
export function parseJson(text: string): unknown {
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** The vendor's error object, when the body is one: `{ error: <n>, ... }`. */
export function errorObject(body: unknown): Record<string, unknown> | undefined {
  if (body && typeof body === "object" && !Array.isArray(body) && "error" in body) {
    return body as Record<string, unknown>;
  }
  return undefined;
}

/** Turn a failed response into one English sentence, from the body first. */
export function describeError(status: number, body: unknown): { message: string; code?: number } {
  const err = errorObject(body);
  if (err) {
    const code = Number(err.error);
    if (code === 8) {
      return {
        code,
        message: `KlickTipp error 8: invalid value for field "${err.name ?? err.field ?? "?"}" — ` +
          `${err.reason ?? "validation failed"} (sent: ${JSON.stringify(err.field_value)})`,
      };
    }
    let text = ERROR_CODES[code] ?? String(err.error_message ?? "unknown error");
    if (code === 10 && err.code !== undefined) {
      text += `: ${UPDATE_SUBCODES[Number(err.code)] ?? `subcode ${err.code}`}`;
    }
    return { code, message: `KlickTipp error ${code}: ${text}` };
  }
  if (Array.isArray(body) && body.every((m) => typeof m === "string") && body.length > 0) {
    return { message: `KlickTipp HTTP ${status}: ${body.join("; ")}` };
  }
  return { message: `KlickTipp HTTP ${status}: unexpected response body` };
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/**
 * Call the Management or Listbuilding API and return the parsed JSON body.
 * Throws {@link KlickTippError} for any non-2xx status, any `{ error }` body,
 * or a body that is not JSON. Never sets credentials — `sign` does that.
 */
export async function kt(
  ctx: HookContext,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  options: RequestOptions = {},
): Promise<unknown> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(options.query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  const headers: Record<string, string> = { accept: "application/json" };
  const init: RequestInit = { method, headers };
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  const res = await ctx.fetch(`${BASE_URL}${path}${qs ? `?${qs}` : ""}`, init);
  const body = parseJson(await res.text());
  if (!res.ok || errorObject(body)) {
    const { message, code } = describeError(res.status, body);
    throw new KlickTippError(message, res.status, code);
  }
  if (body === undefined) {
    throw new KlickTippError(`KlickTipp HTTP ${res.status}: response was not JSON`, res.status);
  }
  return body;
}

/** A successful write answers `[true]`. Anything else is a failure, whatever the status said. */
export function expectTrue(body: unknown, what: string): true {
  if (Array.isArray(body) && body[0] === true) return true;
  throw new KlickTippError(
    `KlickTipp ${what} did not confirm success: ${JSON.stringify(body)}`,
    200,
  );
}

/** A successful create answers `[<id>]`. */
export function expectId(body: unknown, what: string): number {
  if (Array.isArray(body) && body.length > 0 && Number.isFinite(Number(body[0]))) {
    return Number(body[0]);
  }
  throw new KlickTippError(`KlickTipp ${what} did not return an id: ${JSON.stringify(body)}`, 200);
}

/** Path-segment guard: ids are numeric or an alphanumeric subscriber key. */
export function seg(value: unknown, what: string): string {
  const s = String(value ?? "").trim();
  if (!/^[A-Za-z0-9]+$/.test(s)) throw new Error(`${what} must be alphanumeric, got "${s}"`);
  return s;
}

/** Parse a comma-separated list of positive integers (tag IDs, contact IDs). */
export function idList(value: unknown, what: string, max: number): number[] {
  const parts = String(value ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error(`${what} must list at least one numeric ID`);
  if (parts.length > max) throw new Error(`${what} accepts at most ${max} IDs`);
  return parts.map((p) => {
    if (!/^[1-9][0-9]*$/.test(p)) throw new Error(`${what}: "${p}" is not a numeric ID`);
    return Number(p);
  });
}

/** The session cookie the Management API expects: `<session_name>=<sessid>`. */
export interface KlickTippSession {
  username: string;
  password: string;
  sessid: string;
  sessionName: string;
}

export function sessionCookie(c: Partial<KlickTippSession>): string {
  return `${c.sessionName}=${c.sessid}`;
}

/** `POST /account/login`. Success is decided by the body carrying both session parts. */
export async function login(
  ctx: HookContext,
  username: string,
  password: string,
): Promise<{ sessid: string; sessionName: string; account?: Record<string, unknown> }> {
  const res = await ctx.fetch(`${BASE_URL}/account/login`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = parseJson(await res.text());
  const obj = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : undefined;
  if (obj && typeof obj.sessid === "string" && typeof obj.session_name === "string") {
    return {
      sessid: obj.sessid,
      sessionName: obj.session_name,
      account: obj.account as Record<string, unknown> | undefined,
    };
  }
  throw new KlickTippError(
    `KlickTipp login failed — ${describeError(res.status, body).message}`,
    res.status,
  );
}

/** A multiselect (array) or comma-separated string, normalised to `a,b,c`; empty → undefined. */
export function csv(value: unknown): string | undefined {
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  const out = list.map((v) => String(v).trim()).filter(Boolean);
  return out.length > 0 ? out.join(",") : undefined;
}

/** Same as {@link csv} but as an array, for the JSON-body filters of `/subscriber/tagged`. */
export function list(value: unknown, fallback: string[]): string[] {
  const c = csv(value);
  return c ? c.split(",") : fallback;
}

/**
 * Data fields arrive as a JSON object (or its text). The API documents every
 * value as a string — dates and times as Unix-second strings — so values are
 * stringified here rather than left to the vendor's validator.
 */
export function fieldsObject(value: unknown): Record<string, string> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  let obj: unknown = value;
  if (typeof value === "string") {
    try {
      obj = JSON.parse(value);
    } catch {
      throw new Error('fields must be a JSON object such as {"fieldFirstName":"Alex"}');
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error('fields must be a JSON object such as {"fieldFirstName":"Alex"}');
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === null ? "" : String(v);
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Drop undefined/empty values so optional body keys are simply absent. */
export function compact(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ""));
}
