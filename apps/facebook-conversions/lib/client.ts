import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Pinned to Graph API v25.0.
 *
 * Checked 2026-08-03 against developers.facebook.com/docs/graph-api/changelog/
 * versions/: the active window ran from v22.0 (expiring 2027-05-20) through
 * v26.0 (released 2026-07-29, days before this app was written). v25.0 shipped
 * 2026-02-18 and expires 2028-07-29 — the longest runway of any version that
 * has been in the field long enough to be boring, and the version Meta's own
 * Conversions API pages use in their `curl` examples. Bump when v25.0
 * approaches its own sunset.
 *
 * This deliberately differs from the sibling `facebook` app's v23.0 pin: that
 * app was pinned for a Pages/Insights surface, and there is no reason for two
 * independently-versioned apps to move in lockstep.
 */
export const API_VERSION = "v25.0";
export const API_URL = `https://graph.facebook.com/${API_VERSION}`;

/**
 * The `/events` response. `messages` carries non-fatal warnings — an event can
 * be accepted (`events_received: 1`) while still being told it is missing a
 * recommended parameter, so a caller should read both.
 */
export interface ConversionsResponse {
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
}

/** Graph list envelope, as used by the `da_checks` edge. */
export interface GraphListResponse<T = unknown> {
  data: T[];
  paging?: { cursors?: { before?: string; after?: string }; next?: string; previous?: string };
}

export interface RequestOptions {
  method?: string;
  /** Query-string parameters. Reads take everything this way. */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** JSON request body. Only `/events` uses one. */
  body?: unknown;
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
 * The dataset (pixel) id every Conversions API call is addressed to.
 *
 * Resolution order:
 *   1. an explicit `datasetId` action param — lets one Connection fan out
 *      across several datasets, which is the norm for agencies;
 *   2. `ctx.connection.display.dataset.id`, stamped at connect time by the
 *      `conversions-token` auth method's `afterConnect`.
 *
 * The `oauth2` method has no dataset of its own (nothing in an OAuth grant
 * names one), so connections made that way must always pass the param. The
 * error says so rather than letting the request 404 on `/undefined/events`.
 */
export function datasetFromConnection(
  connection: RedactedConnection | undefined,
  override?: string,
): string {
  const explicit = override?.trim();
  if (explicit) return explicit;

  const display = (connection?.display ?? {}) as { dataset?: { id?: string } };
  const fromConnection = display.dataset?.id;
  if (fromConnection) return fromConnection;

  throw new Error(
    "No dataset (pixel) id — set the Dataset ID parameter, or reconnect with the " +
      "Conversions API Token method, which stores one on the connection.",
  );
}

/**
 * Thin wrapper over `ctx.fetch`. It never stamps a credential: the runtime
 * routes every request through the auth `sign` hook, which is the only code
 * handed one. Graph accepts the token either as an `access_token` query
 * parameter or as a bearer credential in the request header — this app uses
 * the latter, which is what `sign` produces, and which keeps the token out of
 * URLs (and therefore out of logs).
 */
export class ConversionsClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.params) {
      for (const [k, v] of Object.entries(options.params)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
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

    if (!res.ok) {
      const err = (parsed as FacebookErrorBody | undefined)?.error;
      const detail = err?.error_user_msg ?? err?.message ?? (text || res.statusText);
      throw new Error(
        `Meta Conversions API ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    return parsed as T;
  }
}

/**
 * Coerce a `type: "json"` param. Hosts hand these over already parsed, but a
 * workflow expression can just as easily produce the JSON text, and failing on
 * a string the caller can see is valid JSON is a bad trade.
 */
export function asJsonValue(value: unknown, label: string): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}
