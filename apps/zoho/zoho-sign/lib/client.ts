import type { HookContext, RedactedConnection } from "@w6w/types";
import { REGIONS } from "./regions.ts";
import { buildMultipart, type MultipartFile } from "./multipart.ts";

/**
 * Zoho Sign REST API client.
 *
 * Every path, verb, body shape and response envelope here was verified on 2026-09-29 against
 * Zoho's own documentation under `https://www.zoho.com/sign/api/` — the left-nav on that
 * section is client-rendered and not indexed, so the individual pages were found via the
 * Wayback Machine's CDX index of that path and then fetched live (`api-endpoint.html`,
 * `getting-started.html`, `getting-started-with-zoho-sign-api.html`, `oauth.html`,
 * `basic-concepts.html`, `error-codes.html`, `api-limitations.html`, `embedded-signing.html`,
 * `document-managment/*.html`, `template-managment*.html`, `signergroups/list.html`) — plus
 * live unauthenticated/bad-token probes against every regional API host (see `regions.ts`).
 * Nothing here came from a third-party integration directory.
 *
 * ## The API root is `/api/v1`, on a PRODUCT-SPECIFIC host — not the shared `www.zohoapis.<tld>`
 *
 * Unlike Zoho Books/CRM (`www.zohoapis.<tld>`), Zoho Sign has its own dedicated host,
 * `sign.zoho.<tld>` — the same shape as Zoho Desk's `desk.zoho.<tld>`, not Books'. Confirmed
 * live: `GET https://sign.zoho.com/api/v1/templates` with no Authorization header answers
 * `401 {"code":9031,"message":"Ticket invalid","status":"failure"}`.
 *
 * ## The response envelope: `code`, `message`, `status`, and a resource key that is NOT `data`
 *
 * A response is `{"code": 0, "status": "success", "message": "...", "<resource>": ...}` on
 * success (the resource key varies — `"requests"`, `"templates"`, `"signing_groups"`; some
 * bodies, like recall/remind/delete, carry no resource key at all) and `{"code": <n>,
 * "message": "...", "status": "failure"}` on error. `status` is the reliable success/failure
 * discriminator — classification here never trusts HTTP status alone, only the vendor's own
 * `status`/`code`.
 *
 * ## Two different bad-auth codes, worth telling apart
 *
 * `GET /templates` with no Authorization header answers `401 {"code":9031,"message":"Ticket
 * invalid",...}` (no usable auth reached the request); the same call with a
 * syntactically-plausible but dead token answers `401 {"code":9041,"message":"Invalid Oauth
 * token",...}` (a token reached the request and was rejected). Both confirmed live.
 *
 * ## Three request encodings, not one — verified per endpoint, not assumed uniform
 *
 * - **`multipart/form-data`**, `file` + `data` (the JSON envelope as a *plain-text* part, not
 *   URL-encoded) — `POST /requests`, `POST /templates` (uploading a document).
 * - **`application/x-www-form-urlencoded`**, body `data=<url-encoded JSON>` — `POST
 *   /requests/{id}/submit`, `PUT /requests/{id}`, `PUT /templates/{id}`, `POST
 *   /templates/{id}/createdocument`, and `GET` list calls (`data` travels as a query
 *   parameter carrying the same JSON-encoded `page_context` shape there).
 * - **Flat multipart fields, no `data` envelope at all** — `PUT /requests/{id}/delete`
 *   (`recall_inprogress`, `reason` as their own form fields).
 *
 * ## No quota/rate-limit response header exists
 *
 * `api-limitations.html` documents real per-endpoint call ceilings (50 calls/minute overall,
 * tighter per-endpoint limits for template import/export) but a live unauthenticated and a
 * live bad-token call both carry no `X-RateLimit-*` (or similarly named) response header —
 * see `health/quota.ts`.
 */

/** Every documented Sign endpoint hangs off this path segment. */
export const API_PREFIX = "/api/v1";

/** The default (United States) API host, used only where no connection/region is known yet. */
export const DEFAULT_API_HOST = REGIONS.find((r) => r.key === "us")!.apiHost;

/**
 * The API host for this connection, as recorded by `auth/oauth2.ts`'s `afterConnect` (one
 * fixed host per region-specific auth method — see `lib/regions.ts` for why there is no
 * single `oauth2` method with a data-centre field). Falls back to the US host only for a
 * Connection that predates `afterConnect` recording it, which should not happen in practice.
 */
export function apiHostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiHost?: string };
  return display.apiHost || DEFAULT_API_HOST;
}

/** The envelope every Zoho Sign response shares, before its resource key (if any) is known. */
export interface SignEnvelope {
  code?: number;
  message?: string;
  status?: string;
  [resourceKey: string]: unknown;
}

interface SignErrorBody {
  code?: number;
  message?: string;
}

/**
 * Turn a Zoho Sign error response into one actionable line. `code` is the stable machine
 * token Zoho documents per error family (`9031` = no usable auth reached the request, `9041`
 * = a dead/invalid token, `12008` = the document was already submitted, ...); `message` is
 * always present and human-readable.
 */
export function formatSignError(status: number, method: string, path: string, raw: string): string {
  let parsed: SignErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as SignErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message) {
    const trimmed = raw.length > 600
      ? `${raw.slice(0, 600)}… (${raw.length} bytes truncated)`
      : raw;
    return `Zoho Sign ${status} for ${method} ${path}: ${trimmed}`;
  }
  return `Zoho Sign ${status}${
    parsed.code !== undefined ? ` (code ${parsed.code})` : ""
  } for ${method} ${path}: ${parsed.message}`;
}

/**
 * Pull the resource payload out of a Sign envelope by its (endpoint-specific) key —
 * `"requests"` (an object for a get/create, an array for a list), `"templates"` likewise.
 * Throws if the key is absent, since every documented success response that HAS a resource
 * carries it under its own name.
 */
export function unwrapResource<T>(body: SignEnvelope, resourceKey: string): T {
  const value = body[resourceKey];
  if (value === undefined) {
    throw new Error(
      `Zoho Sign response carried no "${resourceKey}" key (message: ${body.message ?? "none"})`,
    );
  }
  return value as T;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Parse a JSON param (array or object) the caller may have sent as a string or already-parsed. */
export function parseJson<T>(raw: unknown, paramName: string, required = true): T | undefined {
  if (raw === undefined || raw === null || raw === "") {
    if (required) throw new Error(`\`${paramName}\` is required and must be JSON.`);
    return undefined;
  }
  try {
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
  } catch {
    throw new Error(`\`${paramName}\` must be valid JSON.`);
  }
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime routes every
 * request through the auth `sign` hook, which stamps `Zoho-oauthtoken`.
 */
export class ZohoSignClient {
  private host: string;

  constructor(private ctx: HookContext) {
    this.host = apiHostFromConnection(ctx.connection);
  }

  private buildUrl(path: string, query: Record<string, string | undefined> = {}): URL {
    const url = new URL(`https://${this.host}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
    return url;
  }

  private async send(
    url: URL,
    init: RequestInit,
    method: string,
  ): Promise<SignEnvelope> {
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    let body: SignEnvelope | null = null;
    if (text) {
      try {
        body = JSON.parse(text) as SignEnvelope;
      } catch { /* non-JSON body — fall through, formatSignError handles it */ }
    }
    if (!res.ok || body?.status === "failure") {
      throw new Error(formatSignError(res.status, method, url.pathname, text));
    }
    return body ?? {};
  }

  /**
   * `GET`, optionally carrying a JSON object (e.g. `page_context`) as the `data` query
   * parameter — the shape every documented list endpoint expects it in.
   */
  get<T = SignEnvelope>(path: string, data?: unknown): Promise<T> {
    const url = this.buildUrl(path, {
      data: data !== undefined ? JSON.stringify(data) : undefined,
    });
    return this.send(
      url,
      { method: "GET", headers: { accept: "application/json" } },
      "GET",
    ) as Promise<
      T
    >;
  }

  /**
   * `POST`/`PUT` with `application/x-www-form-urlencoded`, body `data=<url-encoded JSON>` plus
   * any sibling top-level fields (e.g. `template-create-document`'s `is_quicksend`, which
   * Zoho Sign documents as its own form field, NOT nested inside `data`).
   */
  sendUrlEncoded<T = SignEnvelope>(
    path: string,
    method: "POST" | "PUT",
    dataObj: unknown,
    extraFields: Record<string, string> = {},
  ): Promise<T> {
    const url = this.buildUrl(path);
    const body = new URLSearchParams({ data: JSON.stringify(dataObj), ...extraFields })
      .toString();
    return this.send(url, {
      method,
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    }, method) as Promise<T>;
  }

  /**
   * `POST`/`PUT` with `multipart/form-data` — a `data` part carrying the JSON envelope as
   * plain text, plus an optional binary `file` part (the document to sign).
   */
  sendMultipartJson<T = SignEnvelope>(
    path: string,
    method: "POST" | "PUT",
    dataObj: unknown,
    file?: MultipartFile,
  ): Promise<T> {
    return this.sendMultipartFields(path, method, { data: JSON.stringify(dataObj) }, file);
  }

  /** `POST`/`PUT` with `multipart/form-data`, flat text fields (no `data` envelope). */
  sendMultipartFields<T = SignEnvelope>(
    path: string,
    method: "POST" | "PUT",
    fields: Record<string, string>,
    file?: MultipartFile,
  ): Promise<T> {
    const url = this.buildUrl(path);
    const { body, contentType } = buildMultipart(fields, file);
    return this.send(url, {
      method,
      headers: { accept: "application/json", "content-type": contentType },
      // `Uint8Array` is a valid runtime `BodyInit` (binary-safe `ctx.fetch`); the DOM lib's
      // `BodyInit` union in this toolchain just doesn't spell that out.
      body: body as unknown as BodyInit,
    }, method) as Promise<T>;
  }

  /** `POST`/`PUT` with no body — recall, remind, delete-template. */
  sendEmpty<T = SignEnvelope>(path: string, method: "POST" | "PUT" = "POST"): Promise<T> {
    const url = this.buildUrl(path);
    return this.send(url, { method, headers: { accept: "application/json" } }, method) as Promise<
      T
    >;
  }
}
