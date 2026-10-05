import type { HookContext } from "@w6w/types";

/**
 * Digistore24 API client.
 *
 * Verified 2026-10-05 against Digistore24's own OpenAPI 3.0 document
 * (`https://digistore24.com/api/docs/openapi.yaml` plus its `paths/*.yaml`
 * references), the developer help center "API basics" article, and live
 * probes against `www.digistore24.com`.
 *
 * ## URL shape
 *
 * One host, one prefix, the function name as the last path segment:
 * `https://www.digistore24.com/api/call/<function>`. Arguments travel as GET
 * or POST parameters (the vendor documents both). Reads here use a query
 * string; writes use a form-encoded POST body, so a value never has to fit in
 * a URL. The OpenAPI document also lists `PUT`/`DELETE` verbs, but the
 * help-center article is explicit that the transport is GET or POST.
 *
 * Nested arguments use PHP bracket notation (`search[email]=…`,
 * `data[type]=…`, `tracking[0][tracking_id]=…`), which {@link flatten}
 * produces.
 *
 * ## Errors arrive as HTTP 200
 *
 * Measured: a missing key and an invalid key both answer **HTTP 200** with
 * `{"result":"error","message":"…","code":2}`. Success is
 * `{"result":"success","data":{…}}`. So a status code says nothing about
 * whether a call worked — {@link Ds24Client} classifies from `result`.
 *
 * ## Booleans
 *
 * The vendor accepts `1/Y/yes/T/true` and `0/N/no/F/false`. This client sends
 * `Y` / `N`, the form its own responses use.
 */

/** The one API origin + prefix. The OpenAPI document also lists a staging host; not used here. */
export const API_BASE = "https://www.digistore24.com/api/call";

export type ParamValue = unknown;

export class Ds24Error extends Error {
  constructor(message: string, readonly code?: number) {
    super(message);
    this.name = "Ds24Error";
  }
}

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Normalise a list param into the comma-joined string Digistore24 expects. */
export function csv(v: string[] | string | undefined | null): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(Boolean);
  return items.length ? items.join(",") : undefined;
}

/**
 * Flatten arguments into PHP-style bracketed form fields.
 *
 * `{ search: { email: "a@b.c" }, tracking: [{ tracking_id: "1" }] }` becomes
 * `search[email]=a@b.c` and `tracking[0][tracking_id]=1`. Booleans become
 * `Y` / `N`; null, undefined and empty strings are dropped.
 */
export function flatten(params: Record<string, unknown>): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const walk = (prefix: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(`${prefix}[${i}]`, item));
    } else if (typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(`${prefix}[${k}]`, v);
      }
    } else if (typeof value === "boolean") {
      out.push([prefix, value ? "Y" : "N"]);
    } else {
      out.push([prefix, String(value)]);
    }
  };
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((item, i) => walk(`${k}[${i}]`, item));
    else if (typeof v === "object") {
      for (const [sk, sv] of Object.entries(v as Record<string, unknown>)) walk(`${k}[${sk}]`, sv);
    } else walk(k, v);
  }
  return out;
}

interface Envelope {
  api_version?: string;
  current_time?: string;
  result?: string;
  message?: string;
  code?: number;
  data?: unknown;
}

/**
 * Parse a Digistore24 response body. Throws {@link Ds24Error} for the vendor's
 * `result:"error"` envelope — whatever the HTTP status — and for anything that
 * is not the envelope at all (an HTML interstitial, a 5xx page).
 */
export function parseEnvelope(status: number, raw: string, fn: string): Envelope {
  let body: Envelope | null = null;
  try {
    body = JSON.parse(raw) as Envelope;
  } catch { /* not JSON */ }
  if (!body || typeof body !== "object") {
    const snippet = raw.length > 300 ? `${raw.slice(0, 300)}…` : raw;
    throw new Ds24Error(`Digistore24 ${status} for ${fn}: unreadable response: ${snippet}`);
  }
  if (body.result === "error") {
    throw new Ds24Error(
      `Digistore24 error${body.code !== undefined ? ` ${body.code}` : ""} for ${fn}: ${
        body.message ?? "no message"
      }`,
      body.code,
    );
  }
  if (body.result !== "success") {
    throw new Ds24Error(`Digistore24 ${status} for ${fn}: response had no result field`);
  }
  return body;
}

export class Ds24Client {
  constructor(private ctx: HookContext) {}

  /**
   * Call one API function and return its `data` payload.
   *
   * An array payload is wrapped as `{ items }` so every action returns an
   * object. `write` selects POST + form body; reads are GET + query string.
   */
  async call<T = Record<string, unknown>>(
    fn: string,
    params: Record<string, unknown> = {},
    options: { write?: boolean } = {},
  ): Promise<T> {
    const fields = flatten(params);
    const headers: Record<string, string> = { accept: "application/json" };
    const url = new URL(`${API_BASE}/${fn}`);
    const init: RequestInit = { method: options.write ? "POST" : "GET", headers };
    if (options.write) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = new URLSearchParams(fields).toString();
    } else {
      for (const [k, v] of fields) url.searchParams.append(k, v);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    const body = parseEnvelope(res.status, await res.text(), fn);
    const data = body.data;
    if (Array.isArray(data)) return { items: data } as T;
    if (data === undefined || data === null) return {} as T;
    return data as T;
  }
}
