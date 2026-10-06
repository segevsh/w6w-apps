import type { HookContext } from "@w6w/types";

/**
 * Thin client for the MSG91 v5 API (`control.msg91.com/api/v5`).
 *
 * Verified 2026-10-06 against the vendor's reference (docs.msg91.com, one page per endpoint)
 * and unsigned / garbage-key probes of the live host.
 *
 *  1. **Failures arrive as HTTP 200.** The SMS/OTP family answers `{"type":"error","message":…}`
 *     with status 200 for a missing key, a bad template, an expired OTP and a wrong OTP alike
 *     (the reference documents 401 for a missing key; live it is 200 `Auth Key missing`). The
 *     newer email/WhatsApp/report family answers a real 401 with
 *     `{"status":"fail","hasError":true,"errors":"Unauthorized","code":"401","apiError":"201"}`.
 *     {@link call} therefore reads the body, never only the status.
 *  2. **The key is not checked first.** `POST /flow` and `POST /otp` with a garbage key answer
 *     "The provided flow ID or template ID is invalid." — the template is validated before the
 *     credential, so that message does not mean the key is good.
 *  3. **Reports are windowed.** Logs cover at most 3 days (start within the last 3 days),
 *     analytics at most 31 days.
 */
export const API_BASE = "https://control.msg91.com/api/v5";

export class Msg91Error extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly vendorMessage: string | undefined,
    readonly vendorCode: string | undefined,
  ) {
    super(message);
    this.name = "Msg91Error";
  }
}

export type Query = Record<string, unknown>;

/** A required value: trimmed and never empty. */
export function requireStr(name: string, value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`${name} is required`);
  return s;
}

/**
 * A phone number in the form MSG91 documents: international, country code first, digits only
 * ("919XXXXXXXXX"). A leading `+`, spaces, dashes and brackets are stripped.
 */
export function normalizeMobile(name: string, value: unknown): string {
  const digits = String(value ?? "").replace(/[\s+\-()]/g, "");
  if (!/^\d{6,15}$/.test(digits)) {
    throw new Error(`${name} must be an international number with country code, e.g. 919876543210`);
  }
  return digits;
}

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/** The vendor's own sentence from an error body (`message`, or `errors` when it is a string). */
export function errorMessage(body: unknown): string | undefined {
  const b = body as { message?: unknown; msg?: unknown; errors?: unknown; error?: unknown } | null;
  for (const m of [b?.message, b?.msg, b?.errors, b?.error]) {
    if (typeof m === "string" && m) return m;
  }
  return undefined;
}

export function errorCode(body: unknown): string | undefined {
  const c = (body as { code?: unknown } | null)?.code;
  return typeof c === "string" || typeof c === "number" ? String(c) : undefined;
}

/** True when a parsed body is one of MSG91's failure envelopes, whatever the HTTP status was. */
export function isFailureBody(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const b = body as Record<string, unknown>;
  return b.type === "error" || b.hasError === true || b.status === "fail" ||
    (typeof b.error === "string" && b.error.length > 0);
}

/** A credential rejection, recognised from the vendor's own wording or code `201`. */
export const AUTH_REJECTED =
  /invalid authkey|auth ?key missing|authentication failure|unauthori[sz]ed/i;

export function isAuthRejection(body: unknown): boolean {
  const msg = errorMessage(body);
  return errorCode(body) === "201" || (msg !== undefined && AUTH_REJECTED.test(msg)) ||
    (body as { apiError?: unknown } | null)?.apiError === "201";
}

/** Drop unset (`undefined`/`null`/empty-string) inputs so a blank field is never sent. */
export function pick(input: Record<string, unknown>, keys: readonly string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = input[k];
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** A `json` param may arrive parsed or as the raw text the user typed. */
export function parseJsonField(name: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

/** A list param: an array, a JSON array in text, or comma-separated text. */
export function parseList(name: string, value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  const t = value.trim();
  if (!t) return [];
  if (t.startsWith("[")) {
    const parsed = parseJsonField(name, t);
    if (!Array.isArray(parsed)) throw new Error(`${name} must be a JSON array`);
    return parsed.map((v) => String(v).trim()).filter(Boolean);
  }
  return t.split(",").map((s) => s.trim()).filter(Boolean);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

/** One request; returns the parsed body, throwing {@link Msg91Error} on any failure envelope. */
export async function call(
  ctx: HookContext,
  method: "GET" | "POST",
  path: string,
  opts: RequestOptions = {},
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { accept: "application/json" };
  const init: RequestInit = { method, headers };
  if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  const res = await ctx.fetch(buildUrl(path, opts.query), init);
  const text = await res.text();
  let json: Record<string, unknown> = {};
  if (text.trim()) {
    try {
      const parsed = JSON.parse(text);
      json = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : { data: parsed };
    } catch {
      json = { message: text.slice(0, 200) };
    }
  }
  if (!res.ok || isFailureBody(json)) {
    const vendor = errorMessage(json);
    const code = errorCode(json);
    throw new Msg91Error(
      `MSG91 ${method} ${path} failed (${res.status}${code ? `, code ${code}` : ""})` +
        `${vendor ? `: ${vendor}` : ""}`,
      res.status,
      vendor,
      code,
    );
  }
  return json;
}
