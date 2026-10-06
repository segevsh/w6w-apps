import type { HookContext } from "@w6w/types";

/**
 * Skyvern REST client (Skyvern Cloud).
 *
 * Every path, verb, parameter and response field in this app was verified on 2026-10-06 against
 * Skyvern's own OpenAPI document (`https://api.skyvern.com/openapi.json`, `info.title` "Skyvern
 * API", version 1.0.0, 566,818 bytes) and live, unauthenticated probes of `api.skyvern.com` and
 * `status.skyvern.com`.
 *
 * - Auth is `x-api-key: <key>` (`components.securitySchemes.ApiKeyAuth`, `in: header`). The
 *   header is stamped by `sign` in `auth/api-key.ts`, never here.
 * - The current surface lives under `/v1`. What older docs call a "workflow" is an "agent" now
 *   (`/v1/agents`, `/v1/run/agents`); the operation ids still say `workflow`.
 * - Errors are FastAPI-shaped: `{"detail": "<message>"}`, and a 422 carries `detail` as an array
 *   of `{loc, msg, type}`.
 * - Lists are bare JSON arrays (no envelope, no total) paged by `page` (1-based) and `page_size`.
 * - Multi-value filters are a REPEATED query key (`status=running&status=failed`).
 */

/** The one origin the OpenAPI document declares for Skyvern Cloud (`servers[0].url`). */
export const API_BASE = "https://api.skyvern.com";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as Array<keyof T>) {
    const v = obj[k];
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Accept a multiselect array or a comma-separated string and return a clean list. */
export function list(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Parse a `json` param that may arrive as an object, or as text a user typed into a field.
 * Returns undefined for empty input and throws a readable error for text that is not JSON.
 */
export function parseJson(name: string, v: unknown): unknown {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

interface ErrorBody {
  detail?: unknown;
  message?: unknown;
}

/** Turn a Skyvern error body into one actionable line. */
export function formatSkyvernError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const d = parsed?.detail ?? parsed?.message;
  let detail: string | undefined;
  if (typeof d === "string") detail = d;
  else if (Array.isArray(d)) {
    detail = d
      .map((e) => {
        const item = e as { loc?: unknown[]; msg?: string };
        const where = Array.isArray(item?.loc) ? item.loc.slice(1).join(".") : "";
        return [where, item?.msg].filter(Boolean).join(": ");
      })
      .filter(Boolean)
      .join("; ");
  } else if (d !== undefined && d !== null) detail = JSON.stringify(d);

  if (!detail) return `Skyvern ${status} for ${method} ${path}: ${truncate(raw)}`;
  return truncate(`Skyvern ${status} for ${method} ${path}: ${detail}`, 1000);
}

export class SkyvernClient {
  constructor(private ctx: HookContext) {}

  /** Parsed JSON body, or `undefined` for an empty / 204 response. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatSkyvernError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
