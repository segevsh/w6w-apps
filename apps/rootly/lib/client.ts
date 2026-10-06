import type { HookContext } from "@w6w/types";

/**
 * Rootly REST API. Verified 2026-10-06 against the vendor's OpenAPI document
 * (`rootly-heroku.s3.amazonaws.com/swagger/v1/swagger.json`, `servers[0].url`
 * `https://api.rootly.com`, `securitySchemes.bearer_auth` = http bearer) and
 * live unauthenticated probes of the host.
 *
 * ## JSON:API on the wire
 *
 * Every body is a JSON:API document and the media type is
 * `application/vnd.api+json`. A write is `{ "data": { "type", ["id",] "attributes" } }`
 * — the `type` is the resource's JSON:API type, which is NOT always the URL
 * segment: a team lives at `/v1/teams` but its type is `groups`. A read answers
 * `{ data, included?, links, meta }` with each resource as
 * `{ id, type, attributes }`. This client flattens a resource to
 * `{ ...attributes, id, type }` so a workflow reads `item.title`, not
 * `item.attributes.title`.
 *
 * ## Query strings
 *
 * Filters, paging and includes use bracketed names (`filter[status]`,
 * `page[number]`, `page[size]`, `page[after]`); `include` and `sort` are plain.
 * Keys are percent-encoded, which the server decodes as brackets.
 *
 * ## Errors
 *
 * `{ "errors": [{ "title", "status", "code"?, "detail"? }] }`, including the 401
 * (`{"errors":[{"title":"Invalid token","status":"401"}]}`, measured for both a
 * missing and a wrong token). The status is a hint; the body names the cause.
 */
export const API_URL = "https://api.rootly.com";
export const CONTENT_TYPE = "application/vnd.api+json";

/** Percent-encode one path segment (ids are caller-supplied strings). */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value).trim());
}

/** Accept a list as a real array or as the comma-separated text a form field produces. */
export function strList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/** Like `strList`, but each member is a number (Rootly user ids are integers). */
export function intList(value: unknown): number[] | undefined {
  const items = strList(value);
  if (!items) return undefined;
  const nums = items.map(Number);
  return nums.every((n) => Number.isFinite(n)) ? nums : undefined;
}

/** A JSON value either parsed or as the JSON text a form field produces. */
export function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/** Drop `undefined`/`null`/empty-string members so the wire carries only what was set. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export type Query = Record<
  string,
  string | number | boolean | Array<string | number> | undefined | null
>;

/**
 * Build `?filter%5Bstatus%5D=started&user_ids%5B%5D=1&user_ids%5B%5D=2`. An array is
 * repeated under the key as given (the caller supplies the `[]` suffix where the
 * endpoint wants one). Unset, null and empty values are skipped.
 */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/** One JSON:API resource object as it arrives. */
export interface Resource {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
}

/** `{ ...attributes, id, type }` — what a workflow actually wants to read. */
export function flatten(resource: Resource | null | undefined): Record<string, unknown> | null {
  if (!resource || typeof resource !== "object") return null;
  return { ...(resource.attributes ?? {}), id: resource.id ?? null, type: resource.type ?? null };
}

export interface Document {
  data?: Resource | Resource[] | null;
  included?: Resource[];
  meta?: Record<string, unknown>;
  links?: Record<string, unknown>;
}

/** A list response: flattened `items`, plus the paging `meta`/`links` and any `included`. */
export function listResult(doc: Document) {
  const data = Array.isArray(doc.data) ? doc.data : [];
  return {
    items: data.map((r) => flatten(r)),
    included: (doc.included ?? []).map((r) => flatten(r)),
    meta: doc.meta ?? null,
    links: doc.links ?? null,
  };
}

/** A single-resource response. */
export function itemResult(doc: Document) {
  const data = Array.isArray(doc.data) ? doc.data[0] : doc.data;
  return { item: flatten(data), included: (doc.included ?? []).map((r) => flatten(r)) };
}

/** A JSON:API write body: `{ data: { type, [id,] attributes } }`. */
export function jsonApiBody(type: string, attributes: Record<string, unknown>, id?: string) {
  return { data: { type, ...(id ? { id } : {}), attributes } };
}

/** One human line from a failed response. */
export function errorText(parsed: unknown, raw: string): string {
  const errors = (parsed as { errors?: unknown } | null)?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return errors.slice(0, 5).map((e) => {
      const o = (e ?? {}) as Record<string, unknown>;
      const title = typeof o.title === "string" ? o.title : "";
      const detail = typeof o.detail === "string" ? o.detail : "";
      return [title, detail].filter(Boolean).join(": ");
    }).filter(Boolean).join("; ");
  }
  const text = raw.trim();
  return text.startsWith("<") ? "" : text.slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
  /** `Idempotency-Key` (documented on `POST /v1/incidents` only). */
  idempotencyKey?: string;
}

/**
 * Thin client over `https://api.rootly.com`. Credentials are never handled here:
 * the runtime routes every `ctx.fetch` through the Auth `sign` hook, which stamps
 * `Authorization: Bearer <token>`.
 */
export class RootlyClient {
  constructor(private readonly ctx: HookContext) {}

  async request(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<Document> {
    const url = `${API_URL}${path}${buildQuery(options.query)}`;
    const headers: Record<string, string> = { accept: CONTENT_TYPE };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = CONTENT_TYPE;
      init.body = JSON.stringify(options.body);
    }
    if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey.slice(0, 255);

    const res = await this.ctx.fetch(url, init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch { /* non-JSON body: reported below if the request failed */ }
    }

    if (!res.ok) {
      const detail = errorText(parsed, text);
      throw new Error(
        `Rootly ${method} ${path} failed: HTTP ${res.status}${detail ? ` — ${detail}` : ""}${
          hint(res.status)
        }`,
      );
    }
    return (parsed ?? {}) as Document;
  }
}

function hint(status: number): string {
  switch (status) {
    case 401:
      return " (API token missing or invalid)";
    case 403:
      return " (the token's role lacks permission for this resource)";
    case 404:
      return " (no such resource, or not visible to this token)";
    case 422:
      return " (Rootly rejected the attributes)";
    case 429:
      return " (rate limited: 3,000 requests per 60 seconds)";
    default:
      return "";
  }
}
