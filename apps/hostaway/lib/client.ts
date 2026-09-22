import type { HookContext } from "@w6w/types";

/**
 * Hostaway Public API client.
 *
 * Every fact here was read out of Hostaway's own documentation —
 * `https://api.hostaway.com/documentation`, a ~2.9MB Postman-Documenter page that IS
 * the spec (there is no OpenAPI/collection JSON behind it) — and, where a live probe
 * was possible without credentials, confirmed on the wire on 2026-09-22.
 *
 * ## One host, one version, one scope
 *
 * Every documented path is `https://api.hostaway.com/v1/...`; there is no v2 and no
 * second host. The only public endpoint that is NOT under this app's credential is
 * `POST /v1/accessTokens`, the OAuth2 client-credentials token endpoint (see
 * `auth/client-credentials.ts`).
 *
 * ## The envelope, and why HTTP status is not the discriminator
 *
 * "Standard Response" (verbatim):
 *
 *     { "status": "success", "result": "<endpoint result>", "limit": null,
 *       "offset": null, "count": 1, "page": 1, "totalPages": 1 }
 *
 * `status` is `"success"` or `"fail"`; on `fail`, the human-readable error is a
 * string. The docs put it in `result`, and their own Update-a-listing error example
 * and the live responses confirm the vendor also uses `message` on the same posture —
 * verified live 2026-09-22 with an unsigned `GET /v1/users?limit=1`:
 *
 *     HTTP/2 403, content-type: application/json
 *     {"status":"fail","message":"The resource owner or authorization server denied the request."}
 *
 * So {@link failureMessage} classifies from `status` first and accepts either carrier,
 * which is what this vendor's documented discriminator is for. A `200` carrying
 * `{"status":"fail",...}` (Hostaway does this for some validation errors, e.g. an
 * invalid `cancellationPolicy`) is still a failure.
 *
 * The other failure posture this app sees is NOT an envelope: the token endpoint
 * answers a fabricated credential with the RFC 6749 §5.2 shape
 * `{"error":"invalid_client","error_description":"Client authentication failed",...}`
 * (verified live, HTTP 401) — handled in `auth/client-credentials.ts`, not here.
 *
 * ## Pagination
 *
 * List endpoints take `limit`/`offset` (0-based) and answer the envelope's
 * `count`/`page`/`totalPages` for the page you asked for; some also document
 * cursor paging via `afterId`, which this app deliberately does not build (page/offset
 * is what every example in the docs uses). {@link HostawayClient.requestPage} keeps
 * that paging metadata alongside the array so a workflow can page without guessing.
 *
 * ## Arrays in query strings and forms
 *
 * Hostaway's documented convention is bracket suffixes: `?attachObjects[]=bookingEngineUrls`,
 * `?specialStatus[]=active` in a query, and `listingMapIds[0]=123` / `channelIds[0]=2007`
 * as form fields on the finance reports. {@link HostawayClient} serializes query arrays
 * as `key[]` and {@link HostawayClient.requestForm} serializes form arrays as `key[i]`.
 *
 * The finance-report form fields are documented as **multipart**, not urlencoded, even
 * though the docs' own "Financial Reporting" prose just says "POST form data": the curl
 * example uses `--form` (curl's flag for `multipart/form-data`) and the PHP example passes
 * `CURLOPT_POSTFIELDS` as an **array**, which php-curl only ever multipart-encodes.
 * {@link HostawayClient.requestForm} builds a `FormData` body for exactly that reason.
 *
 * ## Rate limits are headers on a 429, not a call you can make
 *
 * "Rate limits" documents per-account counters (200/10s general, 200/10s for
 * `POST /v1/reservations`, 30/minute for `POST /v1/conversations/{id}/messages`,
 * 400/10s for the calendar price-details endpoint) and states the
 * `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Retry-After` /
 * `X-RateLimit-Applied` headers **"appear on 429 responses only"**.
 * `X-RateLimit-Retry-After` is a Unix timestamp to retry AT, not a delay. There is no
 * headroom endpoint to poll, so `health/quota.ts` declares that absence.
 *
 * ## Signing is not this module's job
 *
 * Nothing here sets an Authorization header: the runtime routes every request through
 * the auth `sign` hook (see `auth/client-credentials.ts`), so an Action cannot read,
 * build or leak the credential.
 */

/** Every documented path in this app hangs off this v1 base. */
export const API_BASE = "https://api.hostaway.com/v1";

/** The client-credentials token endpoint — the one thing every account can call unnamed. */
export const TOKEN_PATH = "/accessTokens";

/** The only scope Hostaway accepts; always literally `general`. */
export const SCOPE = "general";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Arrays serialize as repeated `key[]` params, per the docs' own examples. */
  query?: Record<string, QueryValue | QueryValue[]>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Extra headers merged over the defaults; never a credential. */
  headers?: Record<string, string>;
}

/**
 * Hostaway's "Standard Response" envelope. Only list endpoints fill the paging
 * fields; everything else leaves them null.
 */
export interface Envelope<T = unknown> {
  status?: string;
  result?: T;
  /** The failure text on some `status: "fail"` bodies (see this module's doc). */
  message?: string;
  limit?: number | null;
  offset?: number | null;
  count?: number | null;
  page?: number | null;
  totalPages?: number | null;
}

/** A page of a list endpoint: the vendor's array plus its documented paging metadata. */
export interface Page<T> {
  items: T[];
  count?: number | null;
  page?: number | null;
  totalPages?: number | null;
  limit?: number | null;
  offset?: number | null;
}

/**
 * The vendor's documented failure text, or `undefined` when the body is not a
 * `status: "fail"` envelope. Accepts `result` (what the docs' "Standard Response"
 * section names) and `message` (what the live 403 and the docs' own Update-a-listing
 * error example use).
 */
export function failureMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const envelope = body as Envelope;
  if (envelope.status !== "fail") return undefined;
  if (typeof envelope.result === "string" && envelope.result.length > 0) return envelope.result;
  if (typeof envelope.message === "string" && envelope.message.length > 0) return envelope.message;
  return 'Hostaway reported status "fail"';
}

/** True for a body shaped like the documented envelope (a string `status` and a `result`). */
function isEnvelope(body: unknown): body is Envelope {
  return !!body && typeof body === "object" && "status" in body && "result" in body;
}

/** Unwrap the documented envelope's `result`; pass a bare body straight through. */
export function unwrapResult<T>(body: unknown): T {
  if (isEnvelope(body)) return body.result as T;
  return body as T;
}

/**
 * Drop keys the caller left unset, so a partial update never overwrites a live value
 * with `null`. `false` and `0` survive — Hostaway uses both meaningfully (`isPaid`,
 * `instantBookable`, `desiredUnitsToSell`, `closedOnArrival`).
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === "") continue;
    out[key as keyof T] = value as T[keyof T];
  }
  return out;
}

/** `listingMapIds[0]=1&listingMapIds[1]=2` — the form-field array shape the docs use. */
export function formArray(key: string, values: Array<string | number>): Array<[string, string]> {
  return values.map((value, index) => [`${key}[${index}]`, String(value)] as [string, string]);
}

/** A path segment, percent-encoded. Ids are numeric, but never assume it. */
export function segment(value: unknown): string {
  return encodeURIComponent(String(value ?? "").trim());
}

/** A trimmed string, or `undefined` when the caller left it blank. */
export function asText(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text === "" ? undefined : text;
}

/** `Number()` for a form value, passing unset/blank through as `undefined`. */
export function asNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Hostaway's documented boolean posture: "boolean type should be considered as integer
 * `0` or `1` value" — used for `isPaid`, `instantBookable`, `includeResources` and the
 * filter flags.
 */
export function asFlag(value: unknown): 1 | 0 | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value ? 1 : 0;
  const text = String(value).trim().toLowerCase();
  if (["1", "true", "yes"].includes(text)) return 1;
  if (["0", "false", "no"].includes(text)) return 0;
  return undefined;
}

export class HostawayClient {
  constructor(private ctx: HookContext) {}

  /**
   * One request, classified by the vendor's own envelope rather than by HTTP status
   * alone. Throws on a `status: "fail"` body (whatever the code) and on a non-2xx
   * response that never produced an envelope.
   */
  private async send(
    path: string,
    options: RequestOptions,
  ): Promise<{ res: Response; text: string; body: unknown }> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === undefined || item === null || item === "") continue;
          url.searchParams.append(`${key}[]`, String(item));
        }
        continue;
      }
      url.searchParams.set(key, String(value));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    let body: string | FormData | undefined;
    if (options.body instanceof FormData) {
      // Multipart: the runtime must generate the boundary, so no content-type is set here.
      body = options.body;
    } else if (typeof options.body === "string") {
      // A pre-serialized body goes verbatim.
      body = options.body;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), {
      method: options.method ?? "GET",
      headers,
      body,
    });
    const text = await res.text();
    let parsed: unknown;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined; // CSV (the finance reports) and other non-JSON bodies
      }
    }

    const failure = failureMessage(parsed);
    if (failure) {
      throw new Error(
        `Hostaway ${options.method ?? "GET"} ${url.pathname}: ${failure}`,
      );
    }
    if (!res.ok) {
      const detail = text.trim().slice(0, 300) || res.statusText || "no body";
      throw new Error(
        `Hostaway ${res.status} for ${options.method ?? "GET"} ${url.pathname}: ${detail}`,
      );
    }
    return { res, text, body: parsed };
  }

  /** A request whose documented result is a single object (or a bare array). */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { body } = await this.send(path, options);
    return unwrapResult<T>(body);
  }

  /** A list request: the documented array plus the envelope's paging metadata. */
  async requestPage<T = unknown>(path: string, options: RequestOptions = {}): Promise<Page<T>> {
    const { body } = await this.send(path, options);
    const envelope = body as Envelope<T[]> | undefined;
    const items = Array.isArray(body)
      ? body as T[]
      : Array.isArray(envelope?.result)
      ? envelope!.result as T[]
      : [];
    return {
      items,
      count: envelope?.count,
      page: envelope?.page,
      totalPages: envelope?.totalPages,
      limit: envelope?.limit,
      offset: envelope?.offset,
    };
  }

  /** The raw response text — used by the finance reports, whose body is CSV. */
  async requestText(path: string, options: RequestOptions = {}): Promise<string> {
    const { text } = await this.send(path, options);
    return text;
  }

  /**
   * A `multipart/form-data` POST with an array-aware body, which is what
   * `POST /v1/finance/report/standard` actually documents — its curl example uses
   * `--form 'listingMapIds[0]=123'` (curl's `--form` sends multipart, not urlencoded) and
   * its PHP example passes `CURLOPT_POSTFIELDS` as an **array**, which php-curl only
   * multipart-encodes; neither example is the urlencoded shape. Returns the raw text,
   * because that endpoint answers CSV.
   */
  async requestForm(
    path: string,
    fields: Record<string, QueryValue | QueryValue[] | Array<[string, string]>>,
  ): Promise<string> {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        // Pre-expanded `key[i]` pairs from `formArray()`, or a bare scalar list.
        for (const item of value) {
          if (Array.isArray(item)) form.append(String(item[0]), String(item[1]));
          else form.append(`${key}[]`, String(item));
        }
        continue;
      }
      form.set(key, String(value));
    }
    // No content-type header: the runtime must generate the multipart boundary.
    return await this.requestText(path, { method: "POST", body: form });
  }
}
