import type { HookContext } from "@w6w/types";

/** Outreach's API host. The one and only host this app calls. */
export const API_BASE = "https://api.outreach.io";
/** Every resource path below is relative to this. */
export const API_ROOT = `${API_BASE}/api/v2`;
/**
 * Outreach requires the JSON:API media type in `Content-Type` on EVERY request,
 * reads included — a request without it gets a 415 `unsupportedMediaType`.
 */
export const MEDIA_TYPE = "application/vnd.api+json";

/** A JSON:API error object, as Outreach documents it. */
export interface JsonApiError {
  id?: string;
  title?: string;
  detail?: string;
  details?: string;
  source?: { pointer?: string };
}

/**
 * Outreach answers errors in TWO shapes. Application-level failures are the
 * documented JSON:API `{errors: [{id, title, detail}]}`; but a token the edge
 * cannot even decode is answered by the gateway with a bare
 * `{error, description}` object (measured live: HTTP 401
 * `{"error":"Invalid JWT token.","description":"The JWT token could not be decoded."}`).
 */
export interface ErrorBody {
  errors?: JsonApiError[];
  error?: string;
  description?: string;
}

export class OutreachError extends Error {
  readonly status: number;
  /** The vendor's own error id (`unauthorizedOauthScope`, `validationError`, …), when sent. */
  readonly code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "OutreachError";
    this.status = status;
    this.code = code;
  }
}

/** The vendor's own error id from either error shape. */
export function errorCode(body: ErrorBody | null | undefined): string | undefined {
  return body?.errors?.[0]?.id;
}

/** One human line for either error shape. Never includes the credential. */
export function describeError(status: number, body: ErrorBody | null | undefined): string {
  const first = body?.errors?.[0];
  if (first) {
    const detail = first.detail ?? first.details;
    const pointer = first.source?.pointer ? ` (${first.source.pointer})` : "";
    return `Outreach ${status} ${first.id ?? first.title ?? "error"}: ${
      detail ?? first.title ?? ""
    }${pointer}`.trim();
  }
  if (body?.error) {
    return `Outreach ${status}: ${body.error}${body.description ? ` ${body.description}` : ""}`;
  }
  return `Outreach returned HTTP ${status}`;
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface SendOptions {
  query?: Query;
  body?: unknown;
}

export interface JsonApiDocument {
  data?: unknown;
  included?: unknown[];
  meta?: Record<string, unknown>;
  links?: Record<string, string | undefined>;
}

/** Positive integer check — every Outreach id is an integer. */
export function requireId(value: unknown, name = "id"): number {
  const n = typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1) {
    throw new Error(`${name} must be a positive integer (got ${JSON.stringify(value)})`);
  }
  return n;
}

export class OutreachClient {
  constructor(private readonly ctx: HookContext) {}

  /**
   * Sends one request and returns the parsed JSON:API document (or `null` for
   * an empty body such as a 204). Credentials are added by the Auth `sign`
   * hook; nothing here ever sees them.
   */
  async send(
    method: string,
    path: string,
    opts: SendOptions = {},
  ): Promise<JsonApiDocument | null> {
    const url = new URL(`${API_ROOT}${path}`);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const init: RequestInit = {
      method,
      headers: { "content-type": MEDIA_TYPE, accept: MEDIA_TYPE },
    };
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }
    if (!res.ok) {
      const body = parsed as ErrorBody | null;
      throw new OutreachError(res.status, describeError(res.status, body), errorCode(body));
    }
    return parsed as JsonApiDocument | null;
  }
}

/** The `page[after]` cursor out of a `links.next` URL, or undefined on the last page. */
export function nextCursor(links: JsonApiDocument["links"]): string | undefined {
  const next = links?.next;
  if (!next) return undefined;
  try {
    return new URL(next).searchParams.get("page[after]") ?? undefined;
  } catch {
    return undefined;
  }
}

/** A JSON:API to-one relationship entry. */
export function relationship(type: string, id: unknown, name?: string) {
  return { data: { type, id: requireId(id, name ?? `${type}Id`) } };
}

/**
 * Webhook configuration carries two working credentials: `secret` (the HMAC key
 * that signs every delivery) and `cleanupToken` (a bearer that can delete the
 * webhook). Neither belongs in a run record, so both are removed from every
 * response. The caller already knows the `secret` they supplied.
 */
export function stripWebhookSecrets<T>(doc: T): T {
  const scrub = (r: unknown) => {
    const attrs = (r as { attributes?: Record<string, unknown> } | null)?.attributes;
    if (attrs && typeof attrs === "object") {
      delete attrs.secret;
      delete attrs.cleanupToken;
    }
  };
  const data = (doc as JsonApiDocument | null)?.data;
  if (Array.isArray(data)) data.forEach(scrub);
  else scrub(data);
  return doc;
}
