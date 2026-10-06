import type { HookContext } from "@w6w/types";

/**
 * iClosed public REST API client.
 *
 * Every path, verb, parameter and body field in this app was verified on
 * 2026-10-06 against iClosed's own OpenAPI 3.0 document
 * (`https://api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`, the
 * file linked from `developer.iclosed.io`), its guide pages (authentication,
 * errors, pagination, rate limiting) and live unauthenticated probes of
 * `public.api.iclosed.io`. Nothing came from a third-party integration
 * directory — the Scribe "connect Zapier" walkthrough the candidate list cites
 * is a screenshot tutorial, not a reference.
 *
 * ## One host
 *
 * `https://public.api.iclosed.io`, every route under `/v1`. The spec also lists
 * `public-dev.api.iclosed.io`, a development host; it is deliberately not
 * declared in `network.allow`.
 *
 * ## The key prefix: the spec and the guide disagree, the wire sides with the guide
 *
 * The OpenAPI `bearerAuth` description says keys look like `iclosed-<token>`.
 * The authentication guide says `iclosed_<token>`. Measured live against
 * `GET /v1/users`:
 *
 *     Bearer iclosed-x  -> 401 {"message":"API key is required"}   (treated as no key)
 *     Bearer iclosed_x  -> 401 {"message":"Invalid API key"}       (a well-formed unknown key)
 *
 * So the underscore is the real prefix, and a header without it is reported as
 * *missing*, not *wrong* — see `auth/api-key.ts`.
 *
 * ## The response envelope is inconsistent, so nothing is unwrapped
 *
 *  - most reads and creates answer `{"data": …}`;
 *  - `GET /contacts/notes`, `GET /fields/objects` and `GET /transactions` put
 *    `count` (and `hasMore`/`nextPage` on fields) beside `data`;
 *  - `GET /fields/contact-stage` answers the bare field object;
 *  - several writes answer `{"message", "status"}` with or without `data`;
 *  - `GET /eventCalls` is documented as answering **201**, not 200.
 *
 * Every action therefore returns the vendor's parsed body verbatim and its
 * `output` states the shape the document declares.
 *
 * ## Errors have three shapes
 *
 * `{"message": "…", "code"?: "…"}` for 401/403/404/500; for a 400 validation
 * failure `message` is itself an **object**
 * (`{status, details: {formErrors, fieldErrors}, endpoint, method}`); and 429
 * answers `{code: "RATE_LIMIT_EXCEEDED", message, retryAfter, limit}`.
 * {@link formatIClosedError} flattens all three into one line and keeps the
 * per-field validation messages, because they are the only place the field name
 * appears.
 *
 * ## Rate limits
 *
 * Per account, per endpoint (path + verb counted separately), per 10-second
 * window: 20 requests on Startup, 100 on Business. There are no rate-limit
 * headers on the wire; the only signal is the 429 body.
 */

/** The one API origin. */
export const API_BASE = "https://public.api.iclosed.io";

/** Every documented path hangs off this prefix. */
export const API_PREFIX = "/v1";

/** `https://public.api.iclosed.io/v1`. */
export const API_URL = `${API_BASE}${API_PREFIX}`;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** Keep an error message readable. */
export function truncate(text: string, max = 700): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Render a boolean query parameter. `false` is kept: dropping it would make the
 * "explicitly false" state unreachable.
 */
export function flag(v: boolean | undefined | null): string | undefined {
  if (v === undefined || v === null) return undefined;
  return v ? "true" : "false";
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 * The host hands a `json` param through in whichever shape it arrived.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Drop keys the caller left unset, so an empty field never reaches the API. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

interface IClosedErrorBody {
  message?: unknown;
  code?: string;
  retryAfter?: number;
  limit?: { points?: number; windowSec?: number };
}

interface ValidationMessage {
  details?: { formErrors?: unknown[]; fieldErrors?: Record<string, unknown> };
}

/** Turn any of the three documented error shapes into one actionable line. */
export function formatIClosedError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const head = `iClosed ${status} for ${method} ${path}`;
  let parsed: IClosedErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as IClosedErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }
  if (!parsed || typeof parsed !== "object") return truncate(`${head}: ${raw}`);

  const parts: string[] = [head];
  const msg = parsed.message;
  if (typeof msg === "string") {
    parts.push(msg);
  } else if (msg && typeof msg === "object") {
    const d = (msg as ValidationMessage).details;
    const form = (d?.formErrors ?? []).map(String);
    const fields = Object.entries(d?.fieldErrors ?? {}).map(([f, m]) =>
      `${f}: ${Array.isArray(m) ? m.join(" ") : String(m)}`
    );
    const detail = [...form, ...fields].join("; ");
    parts.push(detail ? `validation failed — ${detail}` : "validation failed");
  }
  if (parsed.code) parts.push(`code ${parsed.code}`);
  if (status === 429) {
    const lim = parsed.limit
      ? ` (limit ${parsed.limit.points} per ${parsed.limit.windowSec}s per endpoint)`
      : "";
    parts.push(`retry after ${parsed.retryAfter ?? "a few"}s${lim}`);
  }
  return truncate(parts.join(": "), 1000);
}

export class IClosedClient {
  constructor(private ctx: HookContext) {}

  /** The parsed body, verbatim. An empty body becomes `undefined`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
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
      throw new Error(
        formatIClosedError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
