import type { HookContext } from "@w6w/types";

/**
 * Pinned to Graph API v25.0 — the version the sibling `facebook-conversions`
 * app pins. Meta's Custom Audience reference lists v22.0 through v25.0 in its
 * version picker (checked 2026-10-05), and its own request examples use v25.0.
 */
export const API_VERSION = "v25.0";
export const API_URL = `https://graph.facebook.com/${API_VERSION}`;

/** Graph list envelope. */
export interface GraphListResponse<T = unknown> {
  data: T[];
  paging?: { cursors?: { before?: string; after?: string }; next?: string; previous?: string };
}

type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Query-string parameters (reads). */
  params?: Record<string, Scalar>;
  /**
   * Form fields (writes). Meta documents every write on this surface as
   * `-F` / urlencoded form fields, so writes are sent as
   * `application/x-www-form-urlencoded`. Object and array values are
   * JSON-encoded, which is how Meta takes `payload`, `session` and
   * `lookalike_spec`.
   */
  form?: Record<string, unknown>;
}

interface FacebookErrorBody {
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

/**
 * Ad-account ids are addressed as `act_<digits>` on every edge this app uses.
 * Accept either the bare number (what `account_id` returns) or the `act_` form
 * (what `id` returns) and refuse anything else — an id interpolated into a path
 * must not be able to add segments.
 */
export function normalizeAdAccountId(input: unknown): string {
  const raw = String(input ?? "").trim();
  const m = /^(?:act_)?(\d+)$/.exec(raw);
  if (!m) throw new Error("Ad Account ID must be digits, optionally prefixed with act_");
  return `act_${m[1]}`;
}

/** A node id (custom audience, lookalike seed) — digits only, same reasoning. */
export function normalizeNodeId(input: unknown, label: string): string {
  const raw = String(input ?? "").trim();
  if (!/^\d+$/.test(raw)) throw new Error(`${label} must be a numeric id`);
  return raw;
}

/**
 * Thin wrapper over `ctx.fetch`. It never stamps a credential: the runtime
 * routes every request through the auth `sign` hook, which is the only code
 * handed one. Graph takes the token as a bearer header, which keeps it out of
 * URLs and therefore out of logs.
 *
 * Errors name the endpoint and Meta's own message but never the request body —
 * for the users edge that body is hashed customer data.
 */
export class AudiencesClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    if (options.params) {
      for (const [k, v] of Object.entries(options.params)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.form) {
      const body = new URLSearchParams();
      for (const [k, v] of Object.entries(options.form)) {
        if (v === undefined || v === null || v === "") continue;
        body.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
      }
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = body.toString();
    }

    const res = await this.ctx.fetch(url.toString(), init);

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = undefined;
    }

    // Graph can answer an error envelope with a 200 on some paths, so look at
    // the body as well as the status.
    const err = (parsed as FacebookErrorBody | undefined)?.error;
    if (!res.ok || err) {
      const detail = err?.error_user_msg ?? err?.message ?? (text || res.statusText);
      const code = err?.code !== undefined
        ? ` (code ${err.code}${err.error_subcode ? `/${err.error_subcode}` : ""})`
        : "";
      throw new Error(
        `Meta Custom Audiences API ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}${code}`,
      );
    }
    return parsed as T;
  }
}

/**
 * Coerce a `type: "json"` param. Hosts hand these over already parsed, but a
 * workflow expression can just as easily produce the JSON text.
 */
export function asJsonValue(value: unknown, label: string): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}
