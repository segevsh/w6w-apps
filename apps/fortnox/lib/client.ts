import type { HookContext } from "@w6w/types";

/** Every endpoint this app calls lives under `/3/` on this one host. */
export const API_URL = "https://api.fortnox.se";

/**
 * Fortnox's error body. The reference documents it as
 * `{"ErrorInformation": {"Error": <int>, "Message": "<string>", "Code": <int>}}`
 * (`fortnox_ErrorInformation`); the Errors guide shows lower-case keys in places, so both
 * spellings are read (unverified against a live response — no credential was available). `Code` is the stable, documented
 * identifier (the "Errors" guide lists them); `Message` is localised Swedish.
 */
export interface FortnoxErrorInformation {
  code?: number;
  message?: string;
}

/** Normalise either spelling of the `ErrorInformation` envelope. */
export function readErrorInformation(body: unknown): FortnoxErrorInformation | undefined {
  if (!body || typeof body !== "object") return undefined;
  const envelope = (body as Record<string, unknown>)["ErrorInformation"] ??
    (body as Record<string, unknown>)["errorInformation"] ?? body;
  if (!envelope || typeof envelope !== "object") return undefined;
  const e = envelope as Record<string, unknown>;
  const rawCode = e["Code"] ?? e["code"];
  const rawMessage = e["Message"] ?? e["message"];
  const code = typeof rawCode === "number"
    ? rawCode
    : typeof rawCode === "string" && rawCode.trim() !== "" && Number.isFinite(Number(rawCode))
    ? Number(rawCode)
    : undefined;
  const message = typeof rawMessage === "string" ? rawMessage : undefined;
  if (code === undefined && message === undefined) return undefined;
  return { code, message };
}

/**
 * Documented codes (Fortnox "Errors" guide) that mean the access token itself
 * is missing, wrong or expired: 2000310 "Ogiltig inloggning", 2000311 (access
 * token or client secret missing) and 2003275 "Ej autentiserad".
 */
export const INVALID_TOKEN_CODES: readonly number[] = [2000310, 2000311, 2003275];

/**
 * Documented codes that mean the token is VALID but the connection lacks a
 * scope (2000663) or the company lacks the licence for it (2001101). Reaching
 * either proves the credential works.
 */
export const MISSING_SCOPE_CODES: readonly number[] = [2000663, 2001101];

export class FortnoxApiError extends Error {
  constructor(
    public status: number,
    public info: FortnoxErrorInformation | undefined,
    path: string,
  ) {
    super(
      info?.message
        ? `Fortnox ${status} for ${path}: ${info.message}${info.code ? ` (${info.code})` : ""}`
        : `Fortnox ${status} for ${path}`,
    );
    this.name = "FortnoxApiError";
  }
}

/** Drop keys the caller left unset so optional params never overwrite a field with null. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * A `json` param arrives as an object from the editor but as a string from a
 * template expression; accept both, and fail loudly on anything else rather
 * than send Fortnox a payload it will answer with a 2001392.
 */
function parseJson(value: unknown, name: string): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

/** The free-form `additionalFields` escape hatch: a JSON object of Fortnox field names. */
export function jsonObject(value: unknown, name: string): Record<string, unknown> {
  if (value === undefined || value === null || value === "") return {};
  const parsed = parseJson(value, name);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${name} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/** Row arrays (`InvoiceRows`, `VoucherRows`, …). `undefined` when the caller sent none. */
export function jsonArray(value: unknown, name: string): unknown[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = parseJson(value, name);
  if (!Array.isArray(parsed)) throw new Error(`${name} must be a JSON array`);
  return parsed;
}

type Query = Record<string, string | number | boolean | undefined | null>;

/**
 * Thin wrapper over `ctx.fetch` for the Fortnox REST API.
 *
 * `Accept` and `Content-Type` are sent on every call: Fortnox answers a
 * missing or wrong one with error 1000030 / 1000031 rather than defaulting,
 * and also speaks XML, so JSON is requested explicitly.
 *
 * Fortnox updates are `PUT` and, unlike bexio, genuinely partial: a property
 * absent from the body is left unchanged. Pagination is `page` + `limit`
 * (default 100, max 500) with the totals in `MetaInformation`.
 */
export class FortnoxClient {
  constructor(private ctx: HookContext) {}

  private async request<T = unknown>(
    path: string,
    method: string,
    query?: Query,
    body?: unknown,
  ): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      "content-type": "application/json",
    };
    const init: RequestInit = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    let parsed: unknown;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        if (res.ok) throw new Error(`Fortnox returned a non-JSON body for ${path}`);
      }
    }
    if (!res.ok) throw new FortnoxApiError(res.status, readErrorInformation(parsed), path);
    return parsed as T;
  }

  get<T = unknown>(path: string, query?: Query): Promise<T> {
    return this.request<T>(path, "GET", query);
  }

  post<T = unknown>(path: string, body: unknown, query?: Query): Promise<T> {
    return this.request<T>(path, "POST", query, body);
  }

  /** `body` omitted for the action endpoints (`/bookkeep`, `/cancel`, …) that take none. */
  put<T = unknown>(path: string, body?: unknown, query?: Query): Promise<T> {
    return this.request<T>(path, "PUT", query, body);
  }

  /** Fortnox answers a delete with `204 No Content`; surface that as a stable value. */
  async delete(path: string): Promise<{ deleted: true }> {
    await this.request(path, "DELETE");
    return { deleted: true };
  }
}

/** URL-encode one path segment. */
export const seg = (v: string | number): string => encodeURIComponent(String(v));
