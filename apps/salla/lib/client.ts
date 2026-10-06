import type { HookContext } from "@w6w/types";

/** Every action calls under this one base (the reference's single `Production` server). */
export const API_URL = "https://api.salla.dev/admin/v2";

/**
 * The OAuth / identity host. The Authorization guide lists the User Info
 * endpoint (`/oauth2/user/info`) here, not under `/admin/v2`.
 */
export const ACCOUNTS_URL = "https://accounts.salla.sa";

/** The documented ceiling for `per_page` (Pagination guide). */
export const MAX_PER_PAGE = 60;

/**
 * Salla's error envelope, from the "Responses" guide:
 * `{"status": 401, "success": false, "error": {"code": "Unauthorized", "message": "..."}}`
 * with `error.fields` (field → string[]) on a 4xx validation failure. The OAuth
 * server answers with the plain RFC 6749 shape instead
 * (`{"error": "invalid_grant", "error_description": "..."}`), so both are read.
 */
export interface SallaErrorInfo {
  code?: string;
  message?: string;
  fields?: Record<string, string[]>;
}

export function readError(body: unknown): SallaErrorInfo | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  const e = b["error"];
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const fields = o["fields"] && typeof o["fields"] === "object"
      ? o["fields"] as Record<string, string[]>
      : undefined;
    return {
      code: typeof o["code"] === "string" ? o["code"] : undefined,
      message: typeof o["message"] === "string" ? o["message"] : undefined,
      fields,
    };
  }
  if (typeof e === "string") {
    return {
      code: e,
      message: typeof b["error_description"] === "string" ? b["error_description"] : undefined,
    };
  }
  return undefined;
}

/**
 * A 401 does NOT always mean the token is bad. The "Responses" guide documents
 * 401 for a missing scope too ("The access token should have access to one of
 * those scopes: products.read_write"), where the token itself is fine.
 */
export function isMissingScope(info: SallaErrorInfo | undefined): boolean {
  return /should have access to one of those scopes/i.test(info?.message ?? "");
}

export class SallaApiError extends Error {
  constructor(
    public status: number,
    public info: SallaErrorInfo | undefined,
    path: string,
  ) {
    const fields = info?.fields
      ? ` [${
        Object.entries(info.fields).map(([k, v]) => `${k}: ${[v].flat().join(", ")}`).join("; ")
      }]`
      : "";
    super(
      info?.message
        ? `Salla ${status} for ${path}: ${info.message}${fields}`
        : `Salla ${status} for ${path}`,
    );
    this.name = "SallaApiError";
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

function parseJson(value: unknown, name: string): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

/** The free-form `additionalFields` escape hatch: a JSON object of Salla field names. */
export function jsonObject(value: unknown, name: string): Record<string, unknown> {
  if (value === undefined || value === null || value === "") return {};
  const parsed = parseJson(value, name);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${name} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/** An array param (`categories`, `groups`, …); accepts an array, a JSON string or a comma list. */
export function toArray(value: unknown, name: string): Array<string | number> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value as Array<string | number>;
  if (typeof value === "number") return [value];
  if (typeof value === "string") {
    const t = value.trim();
    if (t.startsWith("[")) {
      const parsed = parseJson(t, name);
      if (!Array.isArray(parsed)) throw new Error(`${name} must be a JSON array`);
      return parsed as Array<string | number>;
    }
    return t.split(",").map((s) => s.trim()).filter((s) => s !== "").map((s) =>
      /^-?\d+$/.test(s) ? Number(s) : s
    );
  }
  throw new Error(`${name} must be an array`);
}

/**
 * Body = the explicit fields, layered over the free-form `additionalFields`
 * (explicit fields win), with unset values dropped.
 */
export function buildBody(
  fields: Record<string, unknown>,
  additionalFields: unknown,
): Record<string, unknown> {
  return { ...jsonObject(additionalFields, "additionalFields"), ...compact(fields) };
}

export type Query = Record<
  string,
  string | number | boolean | Array<string | number> | undefined | null
>;

/** `per_page` is capped at 60 (Pagination guide); fail loudly rather than let Salla clamp or 400. */
export function perPage(value: number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Number.isInteger(value) || value < 1 || value > MAX_PER_PAGE) {
    throw new Error(`per_page must be an integer from 1 to ${MAX_PER_PAGE}`);
  }
  return value;
}

/**
 * Thin wrapper over `ctx.fetch` for the Salla Merchant API.
 *
 * Success AND failure both carry a `success` flag in the body, so a 2xx whose
 * body says `success: false` is treated as an error rather than trusted on
 * status alone. Array query params use the bracket form the docs show
 * (`?fields[]=is_blocked`).
 */
export class SallaClient {
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
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(`${k}[]`, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    let parsed: unknown;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        if (res.ok) throw new Error(`Salla returned a non-JSON body for ${path}`);
      }
    }
    const failed = parsed && typeof parsed === "object" &&
      (parsed as Record<string, unknown>)["success"] === false;
    if (!res.ok || failed) {
      const status = res.ok && typeof (parsed as Record<string, unknown>)["status"] === "number"
        ? (parsed as Record<string, number>)["status"]
        : res.status;
      throw new SallaApiError(status, readError(parsed), path);
    }
    return parsed as T;
  }

  get<T = unknown>(path: string, query?: Query): Promise<T> {
    return this.request<T>(path, "GET", query);
  }

  post<T = unknown>(path: string, body: unknown, query?: Query): Promise<T> {
    return this.request<T>(path, "POST", query, body);
  }

  put<T = unknown>(path: string, body: unknown, query?: Query): Promise<T> {
    return this.request<T>(path, "PUT", query, body);
  }

  /** Deletes answer 200/202 with an envelope; surface a stable value either way. */
  async delete(path: string): Promise<{ deleted: true }> {
    await this.request(path, "DELETE");
    return { deleted: true };
  }
}

/** URL-encode one path segment. */
export const seg = (v: string | number): string => encodeURIComponent(String(v));
