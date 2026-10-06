import type { HookContext } from "@w6w/types";

/**
 * Thin client for the Tidio **OpenAPI** (`api.tidio.com`).
 *
 * Every path, verb, query parameter and body field in this app was read on 2026-10-06 from
 * Tidio's own reference (`developers.tidio.com/reference/*.md`, each page embeds its OpenAPI 3.0.3
 * definition) and the guides under `developers.tidio.com/docs/openapi-*.md`. What shaped the
 * client:
 *
 *  1. **Every request needs a version `Accept` header.** `Accept: application/json; version=1`
 *     is mandatory; a request without it is refused (`406 missing_api_version`). It is not a
 *     credential, so it lives here and not in `sign`.
 *  2. **Cursor pagination.** A list answers `{<collection>: [...], meta: {cursor, limit}}`;
 *     `meta.cursor` is the value to pass as `?cursor=` for the next page and `null` means the
 *     last page. Omit `cursor` for the first page.
 *  3. **Errors are `{"errors": [{"code", "message"}]}`.** The vendor's `code` (`unauthorized`,
 *     `api_access_disabled`, `too_many_requests`, `not_found`, ...) is what an error carries, not
 *     just the HTTP status.
 *  4. **Writes mostly answer with no body** (204 for update and delete, 202 for the
 *     contact-message ingest), so the write actions return a small `{ ok }`-style record rather
 *     than nothing.
 */
export const API_BASE = "https://api.tidio.com";
export const ACCEPT = "application/json; version=1";

export class TidioError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | undefined,
    readonly vendorMessage: string | undefined,
  ) {
    super(message);
    this.name = "TidioError";
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Trim and URL-encode a path segment; an empty id would silently hit the collection route. */
export function encodeId(id: unknown): string {
  const s = String(id ?? "").trim();
  if (!s) throw new Error("A required ID was empty");
  return encodeURIComponent(s);
}

/** Ticket IDs are integers (contact, operator and department IDs are UUID strings). */
export function ticketPath(id: unknown): string {
  const n = typeof id === "number" ? id : Number(String(id ?? "").trim());
  if (!Number.isInteger(n) || n < 1) throw new Error("ticket_id must be a positive integer");
  return String(n);
}

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/** `{"errors":[{"code","message"}]}` -> `code: message; code: message`. */
export function errorMessage(body: unknown): { code?: string; message?: string } {
  const errors = (body as { errors?: unknown } | null)?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return {};
  const first = errors[0] as { code?: unknown; message?: unknown };
  const parts = errors.map((e) => {
    const { code, message } = e as { code?: unknown; message?: unknown };
    return [code, message].filter((x) => typeof x === "string" && x).join(": ");
  }).filter(Boolean);
  return {
    code: typeof first?.code === "string" ? first.code : undefined,
    message: parts.length > 0 ? parts.join("; ") : undefined,
  };
}

export interface CallOptions {
  query?: Query;
  body?: unknown;
}

/** Send one request. Returns the parsed JSON body, or `null` for an empty (204) body. */
export async function call(
  ctx: HookContext,
  method: string,
  path: string,
  opts: CallOptions = {},
): Promise<unknown> {
  const headers: Record<string, string> = { accept: ACCEPT };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const res = await ctx.fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const raw = await res.text();
  let parsed: unknown = null;
  if (raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }
  if (!res.ok) {
    const { code, message } = errorMessage(parsed);
    throw new TidioError(
      `Tidio ${method} ${path} failed (${res.status})${message ? `: ${message}` : ""}`,
      res.status,
      code,
      message,
    );
  }
  return parsed;
}

/** Copy the listed keys that are defined (not undefined/null/empty string). */
export function pick(input: object, keys: string[]): Record<string, unknown> {
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = src[k];
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export interface ListResult {
  items: unknown[];
  count: number;
  hasMore: boolean;
  nextCursor: string | null;
  limit: number | null;
  [extra: string]: unknown;
}

/** Fold a `{<key>: [...], meta: {cursor, limit}}` page into the shape every list action returns. */
export function listResult(
  body: unknown,
  key: string,
  map: (item: unknown) => unknown = (x) => x,
  extra: Record<string, unknown> = {},
): ListResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(b[key]) ? b[key] as unknown[] : [];
  const meta = (b.meta ?? {}) as { cursor?: unknown; limit?: unknown };
  const cursor = typeof meta.cursor === "string" && meta.cursor ? meta.cursor : null;
  return {
    items: raw.map(map),
    count: raw.length,
    hasMore: cursor !== null,
    nextCursor: cursor,
    limit: typeof meta.limit === "number" ? meta.limit : null,
    ...extra,
  };
}

/** The deprecated `messenger_id` / `instagram_id` always come back null; drop them. */
export function cleanContact(contact: unknown): unknown {
  if (!contact || typeof contact !== "object") return contact;
  const { messenger_id: _m, instagram_id: _i, ...rest } = contact as Record<string, unknown>;
  return rest;
}

/**
 * Contact properties are `[{name, value}]` on the wire. Accept that, or a plain `{name: value}`
 * object (easier to build in a workflow); reject anything else loudly.
 */
export function toProperties(value: unknown): Array<{ name: string; value: unknown }> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      throw new Error("properties must be JSON: an array of {name, value} or an object");
    }
  }
  if (Array.isArray(v)) {
    return v.map((p) => {
      const { name, value: val } = (p ?? {}) as { name?: unknown; value?: unknown };
      if (typeof name !== "string" || !name) {
        throw new Error("every property needs a non-empty string name");
      }
      return { name, value: val };
    });
  }
  if (typeof v === "object" && v !== null) {
    return Object.entries(v as Record<string, unknown>).map(([name, val]) => ({
      name,
      value: val,
    }));
  }
  throw new Error("properties must be an array of {name, value} or an object");
}

/** Parse a JSON-typed param that may arrive as a string. */
export function parseJson(value: unknown, label: string): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

/** The contact-writable fields shared by create, update and the batch forms. */
export const CONTACT_FIELDS = ["email", "phone", "first_name", "last_name", "email_consent"];

export function contactBody(input: object): Record<string, unknown> {
  const body: Record<string, unknown> = pick(input, CONTACT_FIELDS);
  const props = toProperties((input as { properties?: unknown }).properties);
  if (props) body.properties = props;
  return body;
}
