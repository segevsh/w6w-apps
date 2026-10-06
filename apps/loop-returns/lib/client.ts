/**
 * Thin client over the Loop Returns API (`https://api.loopreturns.com/api/v1`).
 *
 * Loop answers failures in at least four shapes, and several of them arrive with
 * HTTP 200, so success is decided from the BODY, never the status alone:
 *
 *  - `{"error": {"code": "401", "http_code": "GEN-UNAUTHORIZED", "message": "..."}}`
 *    (the gateway's refusal; measured on `/webhooks`, `/destinations`)
 *  - `{"errors": "Unauthorized."}` (a bare string; documented on the Returns API 401)
 *  - `{"errors": {"message": "No return found with this ID."}}` — returned with
 *    HTTP **200** by cancel / flag / close / remove / process
 *  - `{"errors": [{"message": "..."}]}` (remove's 403) and Laravel's
 *    `{"message": "...", "errors": {"field": ["..."]}}` validation envelope (422).
 *
 * `GET /warehouse/return/details` additionally answers `{"error": {"message"}}`
 * with HTTP 200 when no return matches.
 */
import type { HookContext } from "@w6w/types";

export const API_HOST = "api.loopreturns.com";
export const API_BASE = `https://${API_HOST}/api/v1`;

export class LoopError extends Error {
  constructor(message: string, readonly status: number, readonly body: unknown) {
    super(message);
    this.name = "LoopError";
  }
}

/** Percent-encode one path segment. */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id).trim());
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

/** Pull a human sentence out of any of Loop's error shapes, or null if the body is not one. */
export function errorText(body: unknown): string | null {
  if (!isRec(body)) return null;
  const err = body.error;
  if (isRec(err)) {
    const code = typeof err.http_code === "string" ? `${err.http_code}: ` : "";
    if (typeof err.message === "string") return `${code}${err.message}`;
  }
  const errs = body.errors;
  if (typeof errs === "string" && errs) return errs;
  if (Array.isArray(errs)) {
    const parts = errs.map((e) => isRec(e) && typeof e.message === "string" ? e.message : null)
      .filter((m): m is string => !!m);
    if (parts.length) return parts.join("; ");
  }
  if (isRec(errs)) {
    if (typeof errs.message === "string") return errs.message;
    const parts = Object.entries(errs).map(([k, v]) =>
      `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`
    );
    if (parts.length) {
      return typeof body.message === "string"
        ? `${body.message} (${parts.join("; ")})`
        : parts.join("; ");
    }
  }
  return null;
}

/** A bare `{"message": …}` is an error only on a non-2xx (Laravel); on a 2xx it is an ack. */
function bareMessage(body: unknown): string | null {
  return isRec(body) && typeof body.message === "string" && body.message ? body.message : null;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

export class LoopClient {
  constructor(private readonly ctx: HookContext) {}

  /**
   * Send a request and return the decoded JSON body. Throws `LoopError` on a non-2xx status
   * and on a 2xx whose body is one of Loop's error shapes.
   */
  async request(method: string, path: string, opts: RequestOptions = {}): Promise<unknown> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(url.toString(), { method, headers, body });
    const text = await res.text();
    let parsed: unknown = null;
    if (text.trim()) {
      try {
        parsed = JSON.parse(text);
      } catch {
        if (res.ok) {
          throw new LoopError(
            `Loop answered HTTP ${res.status} with a non-JSON body (${text.slice(0, 80)})`,
            res.status,
            text,
          );
        }
      }
    }
    const msg = errorText(parsed) ?? (res.ok ? null : bareMessage(parsed));
    if (!res.ok) {
      throw new LoopError(
        `Loop ${method} ${path} failed (HTTP ${res.status})${msg ? `: ${msg}` : ""}`,
        res.status,
        parsed,
      );
    }
    if (msg !== null) {
      throw new LoopError(`Loop ${method} ${path} refused the request: ${msg}`, res.status, parsed);
    }
    return parsed;
  }

  get(path: string, query?: RequestOptions["query"]) {
    return this.request("GET", path, { query });
  }
  post(path: string, body?: unknown, query?: RequestOptions["query"]) {
    return this.request("POST", path, { body, query });
  }
  put(path: string, body?: unknown) {
    return this.request("PUT", path, { body });
  }
  delete(path: string) {
    return this.request("DELETE", path);
  }
}

/** Read the `cursor` query value out of a `nextPageUrl` / `next_page_url`, if any. */
export function cursorOf(url: unknown): string | null {
  if (typeof url !== "string" || !url) return null;
  try {
    return new URL(url).searchParams.get("cursor");
  } catch {
    return null;
  }
}

/** Drop undefined / empty-string keys from a request body. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== "") out[k] = v;
  return out;
}

/** Parse a comma-separated tag string into a trimmed array; undefined when blank. */
export function splitList(v: unknown): string[] | undefined {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v !== "string" || !v.trim()) return undefined;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Parse a JSON object param supplied as a string (or pass an object through). */
export function jsonObject(label: string, v: unknown): Record<string, unknown> {
  if (isRec(v)) return v;
  if (typeof v !== "string") throw new Error(`${label} must be a JSON object`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(v);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
  if (!isRec(parsed)) throw new Error(`${label} must be a JSON object`);
  return parsed;
}
