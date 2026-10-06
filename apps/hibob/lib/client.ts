/**
 * Thin HiBob (Bob) API client over `ctx.fetch`.
 *
 * Base host `api.hibob.com`, every path under `/v1`. There is no credential in
 * here: the Auth `sign` hook stamps the Basic header onto each request.
 *
 * Bob's error bodies come in two shapes (documented under "Error handling"):
 * `{ key, error, args }` and `{ error, message, statusCode, timestamp }`. A 401
 * can arrive with NO body at all (measured against the live API), so the status
 * line is always part of the message and the vendor text only ever adds to it.
 */
import type { HookContext } from "@w6w/types";

export const API_BASE = "https://api.hibob.com";
export const V1 = "/v1";

export interface HibobErrorBody {
  key?: string;
  error?: string;
  message?: string;
  statusCode?: number;
  args?: unknown[];
}

export class HibobError extends Error {
  readonly status: number;
  readonly body: HibobErrorBody | null;
  constructor(message: string, status: number, body: HibobErrorBody | null) {
    super(message);
    this.name = "HibobError";
    this.status = status;
    this.body = body;
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

export interface HibobResponse<T = unknown> {
  status: number;
  data: T;
  headers: Headers;
}

/** Escape one path segment. Employee ids are numeric strings, list names are free text. */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id).trim());
}

export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/** Vendor text out of an error body, whichever of the two documented shapes it is. */
export function vendorMessage(body: HibobErrorBody | null): string {
  if (!body) return "";
  return [body.message, body.error, body.key]
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .filter((s, i, all) => all.indexOf(s) === i)
    .join(" | ");
}

export function describeFailure(status: number, body: HibobErrorBody | null, path: string): string {
  const vendor = vendorMessage(body);
  const suffix = vendor ? `: ${vendor}` : "";
  switch (status) {
    case 401:
      return `Bob rejected the service user credentials (401)${suffix}. Re-copy the service ` +
        "user ID and token.";
    case 403:
      return `The service user is not permitted to call ${path} (403)${suffix}. Grant the ` +
        "feature and field permissions in its permission group.";
    case 404:
      return `Bob returned 404 for ${path}${suffix}. The id may be wrong, or the module (Time & ` +
        "Attendance, Hiring, ...) may not be enabled for this company.";
    case 429:
      return `Bob rate-limited the request (429)${suffix}. Limits are per endpoint, per minute.`;
    default:
      return `Bob returned ${status} for ${path}${suffix}`;
  }
}

export class HibobClient {
  constructor(private readonly ctx: HookContext) {}

  async request<T = unknown>(
    method: string,
    path: string,
    opts: RequestOptions = {},
  ): Promise<HibobResponse<T>> {
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    const url = `${API_BASE}${V1}${path}${buildQuery(opts.query)}`;
    const res = await this.ctx.fetch(url, init);
    const text = await res.text();

    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }

    if (!res.ok) {
      const body = parsed && typeof parsed === "object" ? parsed as HibobErrorBody : null;
      throw new HibobError(
        describeFailure(res.status, body, `${method} ${path}`),
        res.status,
        body,
      );
    }
    // A 200 whose body is not JSON (a CSV download, an empty acknowledgement) keeps
    // the raw text so the caller can still use it.
    const data = (parsed !== undefined ? parsed : text) as T;
    return { status: res.status, data, headers: res.headers };
  }

  async get<T = unknown>(path: string, query?: Query): Promise<T> {
    return (await this.request<T>("GET", path, { query })).data;
  }

  async post<T = unknown>(path: string, body?: unknown, query?: Query): Promise<T> {
    return (await this.request<T>("POST", path, { body, query })).data;
  }

  /** For calls whose success body is empty or irrelevant: report the status. */
  async ack(
    method: string,
    path: string,
    opts: RequestOptions = {},
  ): Promise<{ status: number; result?: unknown }> {
    const res = await this.request(method, path, opts);
    const result = typeof res.data === "string" && res.data.trim() === "" ? undefined : res.data;
    return result === undefined ? { status: res.status } : { status: res.status, result };
  }
}
