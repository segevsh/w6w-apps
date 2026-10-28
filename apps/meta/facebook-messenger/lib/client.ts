import type { HookContext } from "@w6w/types";

/**
 * Graph API v26.0 — the version every request example on the Messenger Platform
 * docs carried when this app was written (checked 2026-10-06 against
 * developers.facebook.com/docs/messenger-platform/send-messages/, the Messenger
 * Profile API page and the conversation-routing page).
 */
export const API_URL = "https://graph.facebook.com/v26.0";
export const API_HOST = "graph.facebook.com";

export type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Query-string parameters. Empty values are dropped. */
  query?: Record<string, Scalar>;
  /** JSON request body. The Send API and the Messenger Profile API both take JSON. */
  body?: unknown;
}

export interface Paging {
  cursors?: { before?: string; after?: string };
  next?: string;
  previous?: string;
}

export interface ListResponse<T = unknown> {
  data: T[];
  paging?: Paging;
}

interface GraphErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

/** The Graph error envelope's fields, or undefined when the body is not one. */
export function graphError(body: unknown): NonNullable<GraphErrorBody["error"]> | undefined {
  if (body && typeof body === "object" && "error" in body) {
    const e = (body as GraphErrorBody).error;
    if (e && typeof e === "object") return e;
  }
  return undefined;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization: the runtime routes every
 * request through the auth `sign` hook, which is the only code handed the credential.
 *
 * The error is raised from the response BODY (`error.code`, `error.error_subcode`,
 * `error.message`) — Meta can answer 200 with an error envelope on some edges and the
 * status code alone does not say which of its dozens of causes applies.
 */
export class MessengerClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (url.hostname !== API_HOST) {
      throw new Error(`refusing to call ${url.hostname}: only ${API_HOST} is allowed`);
    }
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = undefined;
    }

    const err = graphError(parsed);
    if (err || !res.ok) {
      const sub = err?.error_subcode ? `/${err.error_subcode}` : "";
      const code = err?.code !== undefined ? ` (code ${err.code}${sub})` : "";
      const detail = err?.message ?? (text || res.statusText);
      throw new Error(`Messenger ${res.status} for ${method} ${url.pathname}${code}: ${detail}`);
    }
    return parsed as T;
  }
}

/** `me` resolves to the Page a Page access token belongs to. */
export function pageSegment(pageId?: string): string {
  return encodeURIComponent(pageId && pageId.trim() ? pageId.trim() : "me");
}

/**
 * A `json` param arrives as a parsed value from the editor but as a string from a
 * template expression; accept both, and name the param in the failure.
 */
export function jsonParam<T>(name: string, value: unknown): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      throw new Error(`${name} is not valid JSON`);
    }
  }
  if (value === undefined || value === null) throw new Error(`${name} is required`);
  return value as T;
}

export function requireString(name: string, value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} is required`);
  return value;
}
