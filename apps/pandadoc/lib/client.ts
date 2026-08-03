/**
 * PandaDoc's public REST API. Every path in this app was read off the vendor's
 * own reference at `developers.pandadoc.com/reference/...` (fetched 2026-08-03)
 * — nothing here is inferred from a naming pattern.
 *
 * ## Base URL
 *
 * `https://api.pandadoc.com/public/v1`. There is exactly one API host: PandaDoc
 * offers US and EU **data residency** (its status page even carries separate
 * "US & Global" and "EU" component groups), but that is an account-placement
 * choice, not a second endpoint — `api.eu.pandadoc.com`, `eu-api.pandadoc.com`
 * and `api-eu.pandadoc.com` do not resolve, and the reference documents a
 * single base URL. So `w6w.network.allow` is the single host, not a wildcard.
 *
 * ## Errors
 *
 * Failures answer with a small, uniform JSON envelope — verified live:
 *
 * ```
 * GET /public/v1/documents                       -> 401 {"type":"authentication_error",
 *                                                        "detail":"Authentication credentials were not provided."}
 * GET /public/v1/members/current  (bogus key)    -> 401 {"type":"authentication_error",
 *                                                        "detail":"Invalid key."}
 * ```
 *
 * `type` + `detail` is what this client surfaces. Two status codes are worth
 * knowing about because they are specific to a document workflow rather than
 * generic: **409** is an illegal status transition (or a document that is not in
 * a state the call accepts), and **423** means the document is locked because
 * someone has it open in the editor.
 *
 * ## Success bodies
 *
 * Collections return `{ "results": [...] }` — except webhook subscriptions,
 * which return `{ "items": [...] }`. That inconsistency is the vendor's, not a
 * typo here; each action names the key it actually reads.
 *
 * ## No auth header here
 *
 * The runtime routes every `ctx.fetch` through the auth `sign` hook, which is
 * the only code handed the credential. This client never sets one.
 */
import type { HookContext } from "@w6w/types";

/** The single documented API host. Mirrored in `w6w.network.allow`. */
export const API_HOST = "api.pandadoc.com";

/** Every documented path in this app hangs off `/public/v1`. */
export const API_BASE = `https://${API_HOST}/public/v1`;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** JSON request body. Omitted keys are never sent. */
  body?: unknown;
  /**
   * Return the raw `Response` instead of a parsed JSON body. Used by the one
   * endpoint that answers with `application/pdf` rather than JSON.
   */
  raw?: boolean;
}

/** PandaDoc's error envelope. */
export interface PandaDocError {
  type?: string;
  detail?: unknown;
}

/** Drop `undefined` / `null` / `""` so an unset optional param is never sent. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/**
 * PandaDoc's `detail` is a string on most errors but a nested validation map on
 * a 400 (`{"detail": {"recipients": ["This field is required."]}}`). Flatten
 * whatever shape it is into one line rather than printing `[object Object]`.
 */
function describeDetail(detail: unknown): string | undefined {
  if (detail === undefined || detail === null) return undefined;
  if (typeof detail === "string") return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

/** Thin wrapper over `ctx.fetch`. Never sets an auth header — `sign` does that. */
export class PandaDocClient {
  constructor(private ctx: HookContext) {}

  /** Issue a request and return the parsed JSON body (or the raw `Response`). */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let parsed: PandaDocError | undefined;
      if (text) {
        try {
          parsed = JSON.parse(text) as PandaDocError;
        } catch {
          // Non-JSON error body (a gateway page, say) — fall back to the text.
        }
      }
      const detail = describeDetail(parsed?.detail);
      const label = [parsed?.type, detail].filter(Boolean).join(": ") ||
        (text ? text.slice(0, 200) : res.statusText);
      throw new Error(`PandaDoc ${res.status} for ${method} ${url.pathname}: ${label}`);
    }

    if (options.raw) return res as unknown as T;

    // 204 No Content is a documented success for status-change and delete.
    if (res.status === 204) {
      await res.body?.cancel();
      return undefined as T;
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
