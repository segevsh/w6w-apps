import type { HookContext } from "@w6w/types";

/**
 * VBOUT REST client (`api.vbout.com/1`).
 *
 * Verified 2026-10-06 against the OpenAPI document at
 * `developers.vbout.com/scripts/openapi.json` (71 paths), the Quickstart page, and
 * unauthenticated live probes of the host. The OpenAPI document is low quality (no
 * securitySchemes, leading-slash-less paths, every HTTP status listed, parameter names with
 * stray spaces such as `" listid"`), so every shape here was cross-read against the vendor's own
 * cURL samples and the Quickstart's recorded responses.
 *
 * ## Addressing
 *
 * Every documented sample is `https://api.vbout.com/1/<area>/<action>.json?key=<API key>`, in
 * lower case, so paths are built that way (`emailmarketing/getlists`). The `key` query parameter
 * is added by the Auth `sign` hook, never here.
 *
 * ## GET carries query parameters, POST carries a form body
 *
 * The OpenAPI document lists every parameter as `in: query`, but its POST samples send
 * `email=… status=… listid=… fields[125]=John` as the request body, with only `key` in the URL.
 * Writes therefore send `application/x-www-form-urlencoded`, with a custom-field map flattened to
 * `fields[<id>]=<value>`.
 *
 * ## Deletes are POSTs
 *
 * The OpenAPI document tags delete operations `DELETE`, while the vendor's own cURL sample for each
 * says `POST …/delete…`. The samples are what the vendor's documentation actually shows being
 * called, so deletes are sent as POST.
 *
 * ## The envelope — and the status is not the verdict
 *
 * Every answer is `{"response": {"header": {"status": "ok" | "error", …}, "data": {…}}}`. An
 * error is `header.status === "error"` with `data.errorCode` / `data.errorMessage` (an
 * unauthenticated call is `HTTP 401` + `errorCode 1000`, measured). The verdict is read from the
 * body's `header.status`; the HTTP status is only a hint, and a body with no envelope at all is
 * refused rather than guessed at.
 */

export const API_BASE = "https://api.vbout.com/1";

export type Scalar = string | number | boolean | undefined | null;
export type Params = Record<string, Scalar | Record<string, Scalar>>;

export function encodeId(id: string | number): string {
  return String(id).trim();
}

/** Drop undefined / null / empty-string entries. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out as Partial<T>;
}

/** `true` -> `1`, `false` -> `0` (VBOUT takes `0 | 1` flags); undefined stays undefined. */
export function flag(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  return v === true || v === 1 || v === "1" || v === "true" ? 1 : 0;
}

/** A JSON object given as an object or a JSON string. */
export function toObject(v: unknown, name: string): Record<string, Scalar> | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  let parsed = v;
  if (typeof v === "string") {
    try {
      parsed = JSON.parse(v);
    } catch {
      throw new Error(`VBOUT: ${name} is not valid JSON`);
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`VBOUT: ${name} must be a JSON object`);
  }
  return parsed as Record<string, Scalar>;
}

/** Flatten params into `k=v` / `k[sub]=v` pairs, dropping empties. */
export function formEncode(params: Params = {}): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && typeof v === "object") {
      for (const [sub, sv] of Object.entries(v)) {
        if (sv !== undefined && sv !== null) sp.append(`${k}[${sub}]`, String(sv));
      }
    } else if (v !== undefined && v !== null && v !== "") {
      sp.append(k, String(v));
    }
  }
  return sp.toString();
}

export interface Envelope {
  response: {
    header: { status: string; [k: string]: unknown };
    data: unknown;
  };
}

/** True for the documented `{response: {header: {status}, data}}` envelope. */
export function isEnvelope(body: unknown): body is Envelope {
  if (!body || typeof body !== "object") return false;
  const r = (body as Record<string, unknown>).response;
  if (!r || typeof r !== "object") return false;
  const h = (r as Record<string, unknown>).header;
  return !!h && typeof h === "object" && typeof (h as Record<string, unknown>).status === "string";
}

/** `data.errorMessage` (and code) from an error envelope, or undefined. */
export function errorText(body: unknown): string | undefined {
  if (!isEnvelope(body)) return undefined;
  const d = body.response.data as Record<string, unknown> | null;
  if (!d || typeof d !== "object") return undefined;
  const msg = typeof d.errorMessage === "string" ? d.errorMessage : undefined;
  return msg ? `${msg}${d.errorCode !== undefined ? ` (code ${d.errorCode})` : ""}` : undefined;
}

export class VboutClient {
  constructor(private ctx: HookContext) {}

  /** GET `<path>.json` with query params; returns the unwrapped `data` object. */
  get(path: string, query: Params = {}): Promise<Record<string, unknown>> {
    const qs = formEncode(query);
    return this.send(`${path}.json${qs ? `?${qs}` : ""}`, { method: "GET" });
  }

  /** POST `<path>.json` with a form body; returns the unwrapped `data` object. */
  post(path: string, form: Params = {}): Promise<Record<string, unknown>> {
    return this.send(`${path}.json`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: formEncode(form),
    }).then((data) => ({ ok: true, ...data }));
  }

  private async send(
    pathAndQuery: string,
    init: { method: string; headers?: Record<string, string>; body?: string },
  ): Promise<Record<string, unknown>> {
    const res = await this.ctx.fetch(`${API_BASE}/${pathAndQuery}`, {
      method: init.method,
      headers: { accept: "application/json", ...init.headers },
      body: init.body,
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`VBOUT ${res.status}: response was not JSON`);
    }
    if (!isEnvelope(parsed)) {
      throw new Error(`VBOUT ${res.status}: response was not the documented envelope`);
    }
    if (parsed.response.header.status !== "ok") {
      throw new Error(`VBOUT ${res.status}: ${errorText(parsed) ?? "request failed"}`);
    }
    const data = parsed.response.data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
    return { ok: true, data: data ?? null };
  }
}
