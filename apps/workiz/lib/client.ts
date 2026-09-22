import type { HookContext } from "@w6w/types";

/**
 * Workiz REST client.
 *
 * Every host, path, verb, query parameter and body field in this app was taken
 * from Workiz's own OpenAPI 3.0.0 document (`http://developer.workiz.com/api.json`,
 * 62,971 bytes, `info.title: "Workiz"`) and from live probes against
 * `api.workiz.com` on 2026-09-22. Nothing came from a third-party integration
 * directory.
 *
 * ## One host, and the credential sits IN the path
 *
 * The document declares one server, `https://api.workiz.com`, and every path
 * carries an `/api/v1` prefix. The account's API token is then a **path
 * segment** in the middle of the URL:
 *
 *     https://api.workiz.com/api/v1/{api_token}/<endpoint-path>
 *
 * There is no `Authorization` header and no `?token=` parameter — Workiz
 * documents neither, and neither is used here. Actions therefore build the
 * *token-free* URL (`{API_BASE}{path}`) and the auth `sign` hook is the only
 * code that inserts `{API_PREFIX}/{token}` (see `auth/api-token.ts`). That is
 * why nothing in this file knows a credential exists, and why an error message
 * built here can never contain one.
 *
 * ## Response shapes are inconsistent, so the client does not pretend
 *
 * Three shapes coexist and none is an envelope the others share:
 *
 *  - **Bare arrays** — `GET /team/all/`, `/TimeOff/get/`, `/lead/all/` and
 *    `/lead/get/{UUID}/` answer a JSON array.
 *  - **`{flag, data: [...]}`** — every write (`/lead/create/`, `/job/update/`,
 *    …) answers `flag` plus an array of the identity fields
 *    (`UUID`/`ClientId`/`link`).
 *  - **`{flag, data: {…}}` nested one level deeper** — `GET /job/get/{UUID}/`
 *    answers an array *whose elements* are `{flag, data: <Job>}`, unlike the
 *    lead read which answers the record itself. {@link unwrapRecord} collapses
 *    that wrapper, and {@link unwrapList} tolerates both readings of
 *    `/job/all/` because the vendor's own flattening there is ambiguous.
 *
 * ## Errors are classified from the body, not the status
 *
 * Workiz's one documented refusal is a **403** with
 * `{"success": false, "error": "Forbidden", "message": "Invalid API path or
 * malformed API key."}` — verified live 2026-09-22 with both a fake token and
 * an empty token segment. {@link isForbiddenBody} matches that shape rather
 * than the status code, because the vendor's own error text is generic enough
 * that the *body* is the reliable signal; {@link formatWorkizError} surfaces
 * the vendor's `message` verbatim.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.workiz.com";

/** Every documented path carries this prefix, and the token is spliced in after it. */
export const API_PREFIX = "/api/v1";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** Workiz's refusal body. `error` is a short code, `message` the human text. */
export interface WorkizErrorBody {
  success?: boolean;
  error?: string;
  message?: string;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `{success: false, error: "Forbidden", message: "Invalid API path or malformed
 * API key."}` — the single shape Workiz returns for an invalid or absent API
 * token (verified live 2026-09-22, both with a fake token and with the token
 * segment omitted). Matched on the fields, never on the 403 alone.
 */
export function isForbiddenBody(body: unknown): body is WorkizErrorBody {
  return isObject(body) && body.success === false && body.error === "Forbidden";
}

/**
 * Drop keys the caller left unset, optionally renaming camelCase form keys to
 * Workiz's literal wire names.
 *
 * `false` and `0` survive: `only_open=false` means "include closed records",
 * and dropping it would silently narrow a list to the vendor's default. Only
 * `undefined`, `null` and `""` are treated as "not supplied".
 */
export function compact(
  obj: Record<string, unknown>,
  rename: Record<string, string> = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[rename[k] ?? k] = v;
  }
  return out;
}

/**
 * Path-escape a caller-supplied id (a lead `UUID`, a team `USER_ID`, a
 * `USER_NAME`). `encodeURIComponent` so a value pasted with a `/` or `?` in it
 * cannot rewrite the request path.
 */
export function encodeId(id: string | number | undefined): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Keep an error message readable — a vendor body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Render a failed Workiz call. The path passed in is the token-free one the
 * Action built, so this can never print the credential.
 */
export function formatWorkizError(
  status: number,
  method: string,
  path: string,
  body: unknown,
  raw = "",
): string {
  if (isForbiddenBody(body)) {
    return truncate(
      `Workiz refused ${method} ${path} (${status} Forbidden): ` +
        `${body.message ?? "Invalid API path or malformed API key."}`,
    );
  }
  const message = isObject(body) && typeof body.message === "string" ? body.message : raw.trim();
  return truncate(
    [`Workiz ${status} for ${method} ${path}`, message].filter(Boolean).join(": "),
  );
}

/**
 * Collapse `{flag, data: <record>}` down to `<record>`.
 *
 * Only when `data` is itself an object: the write responses carry an array in
 * `data`, and a caller that wants that array reads it directly ({@link
 * unwrapList} handles it). A value without a `data` object — a bare `Lead`, a
 * team member, a `{$ref: "response"}` row the vendor's schema flattening left
 * behind — passes through unchanged rather than being dropped.
 */
export function unwrapRecord<T = unknown>(value: unknown): T {
  if (isObject(value) && isObject(value.data)) return value.data as T;
  return value as T;
}

/**
 * Normalise any Workiz read into a list.
 *
 * Handles all three shapes the vendor actually returns: a bare array, an array
 * of `{flag, data}` rows, and a single record. `/job/all/`'s shape is
 * documented two ways in the vendor's own spec (flat `Job` rows vs `response`
 * wrappers), so this must not crash on either — a flat row passes through
 * {@link unwrapRecord} untouched, a wrapped row is unwrapped.
 */
export function unwrapList<T = unknown>(body: unknown): T[] {
  let value = body;
  if (isObject(value) && Array.isArray(value.data)) value = value.data;
  if (Array.isArray(value)) return value.map((item) => unwrapRecord<T>(item));
  if (value === undefined || value === null) return [];
  return [unwrapRecord<T>(value)];
}

export class WorkizClient {
  constructor(private ctx: HookContext) {}

  /**
   * Parse one Workiz response, throwing on a refusal.
   *
   * A 2xx body that carries Workiz's Forbidden shape is thrown too: that means
   * the request path was malformed, and returning it as success would hand a
   * caller an array of nothing.
   */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { status, pathname, text } = await this.send(path, options);
    let parsed: unknown;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }
    if (status < 200 || status >= 300 || isForbiddenBody(parsed)) {
      throw new Error(
        formatWorkizError(status, options.method ?? "GET", pathname, parsed, text),
      );
    }
    return parsed as T;
  }

  private async send(
    path: string,
    options: RequestOptions,
  ): Promise<{ status: number; pathname: string; text: string }> {
    // Token-free by construction — `sign` adds `/api/v1/<token>` host-side.
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Workiz declares `status` on /lead/all/ and /job/all/ as an OpenAPI
      // array, whose wire default is a repeated parameter (`status=a&status=b`).
      // The spec does not pin `explode`, so repeated is the reading used here
      // and the one documented in the README.
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
    const text = res.status === 204 ? "" : await res.text().catch(() => "");
    return { status: res.status, pathname: url.pathname, text };
  }
}
