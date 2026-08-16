import type { HookContext } from "@w6w/types";

/**
 * tl;dv Public API (`v1alpha1`) REST client.
 *
 * Everything in this module was verified on 2026-08-16 against the vendor's own
 * machine-readable OpenAPI 3.0 document — embedded as `__redoc_state.spec.data`
 * in the rendered page at `https://doc.tldv.io/` (284,855 bytes; `info.version`
 * `v1alpha1`) — plus live probes against `pasta.tldv.io`. Nothing here came from
 * a third-party integration directory.
 *
 * ## The host is `pasta.tldv.io`, not `api.tldv.io`
 *
 * `api.tldv.io` resolves and answers a bare 9-byte `Not Found` in `text/plain`
 * for every path, including the ones this API actually serves — it LOOKS like a
 * working host with wrong paths, which is the trap. The OpenAPI document
 * declares exactly one server, `https://pasta.tldv.io`, and that is the only
 * host this app ever calls. Confirmed live:
 * `GET https://pasta.tldv.io/v1alpha1/meetings` unauthenticated answers
 * `401 {"name":"AuthorizationRequiredError", ...}` — a real endpoint, not a
 * catch-all.
 *
 * ## `v1alpha1` — the vendor's own name for it
 *
 * The API version is literally `v1alpha1` ("v1 Alpha 1"). The docs say so in
 * plain language: "You are pioneering the tl;dv API... Expect upcoming changes
 * as we sculpt this API masterpiece, evolving towards the stable v1 release."
 * There is no sandbox environment either — "we're currently all about that
 * production data" — so every call this app makes is against live data.
 *
 * ## Two response shapes, and errors do not distinguish "missing" from "wrong"
 *
 * A successful call answers the operation's own top-level shape directly — no
 * `{"data": …}` envelope anywhere in this API, unlike Apify or Fireflies.
 *
 * Failures come in exactly two documented shapes:
 *
 *  - **`400` (validation)** — `{"message", "errors": [{"property",
 *    "constraints"}]}` (the shape the prose "Errors" section documents; the
 *    OpenAPI `ValidationErrorResponse` schema wraps this one level deeper under
 *    an `error` array, which is an authoring artifact of the spec, not what the
 *    wire actually sends — confirmed live: `GET /meetings?meetingType=bogus`
 *    with a key answers `{"name":"BadRequestError","message":"Invalid
 *    queries...","errors":[{"property":"meetingType", "constraints": {...}}]}`,
 *    the flat shape).
 *  - **`401`/`403`/`404`/`500`, …** — `{"name", "message"}`.
 *
 * **A missing key and a wrong key answer the identical body** —
 * `{"name":"AuthorizationRequiredError","message":"Authorization is required
 * for request on GET ..."}` — measured with no header, an empty header and a
 * 20-character garbage string, all three byte-identical. So this vendor gives
 * no way to tell "the connection lost its credential" from "the key was
 * revoked" from the response alone; `formatTldvError` reports the vendor's
 * `name`/`message` verbatim rather than inventing a distinction the API does
 * not make.
 *
 * ## Query-param validation can run BEFORE the auth guard
 *
 * Measured live: `GET /meetings` with a garbage key answers `401`
 * `AuthorizationRequiredError` as expected, but `GET
 * /meetings?meetingType=bogus` with THE SAME garbage key answers `400`
 * `BadRequestError` instead — the invalid enum value short-circuits before the
 * key is ever checked. A `400` from this API is therefore never proof the
 * credential was fine; only a `200` is. `auth/api-key.ts` probes with no query
 * parameters at all, to avoid this ordering entirely.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://pasta.tldv.io";

/** Every documented path carries this prefix — the vendor's own alpha version tag. */
export const API_PREFIX = "/v1alpha1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** The `{"name", "message"}` shape used for 401/403/404/500/… (`BasicErrorResponse`). */
interface BasicErrorBody {
  name?: string;
  message?: string;
}

/** One field failure inside a validation error (`ValidationErrorDescription`). */
interface ValidationIssue {
  property?: string;
  constraints?: Record<string, string>;
}

/** The flat `400` shape actually sent on the wire — see the module doc. */
interface ValidationErrorBody {
  message?: string;
  errors?: ValidationIssue[];
}

/** Keep an error message readable — a validation body can carry several issues. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn tl;dv's error body into one actionable line, whichever of the two
 * documented shapes it is.
 *
 * The credential never enters this module, so the message can carry only
 * tl;dv's own prose and the caller's own input.
 */
export function formatTldvError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: (BasicErrorBody & ValidationErrorBody) | null = null;
  try {
    parsed = JSON.parse(raw) as BasicErrorBody & ValidationErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed) return `tl;dv ${status} for ${method} ${path}: ${truncate(raw)}`;

  if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
    const issues = parsed.errors
      .map((e) => {
        const constraints = e.constraints ? Object.values(e.constraints).join(", ") : undefined;
        return e.property && constraints ? `${e.property}: ${constraints}` : constraints;
      })
      .filter(Boolean)
      .join("; ");
    return truncate(
      `tl;dv ${status} for ${method} ${path}: ${parsed.message ?? "validation failed"}` +
        (issues ? ` (${issues})` : ""),
    );
  }

  const label = parsed.name ? `${status} ${parsed.name}` : String(status);
  return truncate(
    `tl;dv ${label} for ${method} ${path}` + (parsed.message ? `: ${parsed.message}` : ""),
  );
}

/**
 * Drop query keys the caller left unset so an empty form field does not reach
 * tl;dv as an explicit empty string.
 */
export function compactQuery(
  query: Record<string, QueryValue>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export class TldvClient {
  constructor(private ctx: HookContext) {}

  get<T = unknown>(
    path: string,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<T> {
    return this.send<T>(path, { ...options, method: "GET" });
  }

  post<T = unknown>(path: string, options: Omit<RequestOptions, "method"> = {}): Promise<T> {
    return this.send<T>(path, { ...options, method: "POST" });
  }

  private async send<T>(path: string, options: RequestOptions): Promise<T> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(compactQuery(options.query ?? {}))) {
      url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatTldvError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
