import type { HookContext } from "@w6w/types";

/**
 * Pinned to Graph API v23.0 — the same pin as the sibling `facebook` app, so a
 * Facebook Login app registration behaves identically across both.
 *
 * Meta's Instagram reference pages (checked 2026-10-05) name v26.0 as the latest
 * version and document every endpoint this app calls without a version-specific
 * caveat. v23.0 sits inside the live window (and `views`, the replacement for the
 * deprecated `impressions` insight metric, exists from v22.0), so the pin is
 * deliberately one the siblings already run on. Bump `API_URL` together with the
 * `facebook` app when v23.0 nears its two-year sunset.
 *
 * Host: this app speaks the *Instagram API with Facebook Login* flavour, so the
 * host is `graph.facebook.com`. The *Instagram Login* flavour lives on
 * `graph.instagram.com`, issues a different (Instagram User) token that
 * `graph.facebook.com` rejects, and omits several surfaces used here (hashtag
 * search, tags, mentions) — see README.md "Why only Facebook Login".
 */
export const API_URL = "https://graph.facebook.com/v23.0";

/** Graph list envelope: `{ data: T[], paging: { cursors, next? } }`. */
export interface InstagramPaging {
  cursors?: { before?: string; after?: string };
  next?: string;
  previous?: string;
}

export interface InstagramListResponse<T = unknown> {
  data: T[];
  paging?: InstagramPaging;
}

export type ParamValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /**
   * Every parameter — reads and writes alike — travels in the query string, as in
   * Meta's own curl examples (`POST /{ig-user-id}/media_publish?creation_id=...`).
   * `access_token` is never set here: the runtime routes every request through the
   * auth `sign` hook, which stamps `Authorization: Bearer <token>`.
   */
  params?: Record<string, ParamValue>;
}

export interface InstagramErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
    fbtrace_id?: string;
  };
}

/** One line describing a Graph error body, keeping the vendor's own code and subcode. */
export function describeError(body: InstagramErrorBody | undefined): string | undefined {
  const e = body?.error;
  if (!e) return undefined;
  const codes = [e.code, e.error_subcode].filter((c) => c !== undefined).join("/");
  const user = e.error_user_msg && e.error_user_msg !== e.message ? ` (${e.error_user_msg})` : "";
  return `${codes ? `[${codes}] ` : ""}${e.message ?? e.type ?? "unknown error"}${user}`;
}

/** Error thrown for a Graph error response; `code`/`subcode` are Meta's own. */
export class InstagramApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
    readonly subcode?: number,
  ) {
    super(message);
    this.name = "InstagramApiError";
  }
}

/** Percent-encode a path segment so a caller-supplied id can never alter the route. */
export function seg(id: string): string {
  return encodeURIComponent(String(id));
}

/** Accept `"a,b"` or `["a","b"]` and produce the comma-separated form Graph expects. */
export function csv(value: string | string[] | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const list = Array.isArray(value) ? value : String(value).split(",");
  const out = list.map((s) => String(s).trim()).filter(Boolean);
  return out.length ? out.join(",") : undefined;
}

/** Accept a JSON string or a value and produce the JSON string Graph expects. */
export function jsonParam(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization: the runtime routes
 * every request through the auth `sign` hook, the only code handed the credential.
 *
 * Failures are classified from the response BODY (Meta's `error.code` /
 * `error_subcode`), never from the HTTP status alone — Graph answers some
 * application errors with a 4xx that carries a code the caller needs.
 */
export class InstagramClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.params ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const method = options.method ?? "GET";
    const res = await this.ctx.fetch(url.toString(), {
      method,
      headers: { accept: "application/json" },
    });

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = undefined;
    }

    const body = parsed as InstagramErrorBody | undefined;
    if (!res.ok || body?.error) {
      const detail = describeError(body) ?? (text || res.statusText);
      throw new InstagramApiError(
        `Instagram ${res.status} ${res.statusText} for ${method} ${url.pathname}: ${detail}`,
        res.status,
        body?.error?.code,
        body?.error?.error_subcode,
      );
    }
    return parsed as T;
  }
}
