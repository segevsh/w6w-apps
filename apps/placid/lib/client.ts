import type { HookContext } from "@w6w/types";

/**
 * Placid REST API v2.0 client.
 *
 * Verified 2026-10-06 against the reference linked from https://placid.app/docs
 * (`/docs/2.0/rest/{authentication,rate-limit,errors,media,fonts,images,pdfs,videos,
 * templates,collections,layers}`). A search of those pages for deprecat/sunset/end-of-life
 * language finds nothing about the REST API itself, and the `2.0` in every path is the
 * version the docs index points at.
 *
 * - **Base URL** `https://api.placid.app/api/rest` — one host, no sandbox host (test mode is a
 *   per-project switch in the dashboard that watermarks renders).
 * - **Auth** `Authorization: Bearer {TOKEN}`. Tokens are PROJECT-specific.
 * - **Rate limit** 60 requests/minute; headers `X-RateLimit-Limit`, `-Remaining`, `-Reset`
 *   (UTC epoch seconds). `create_now: true` on an image is capped at 10 simultaneous requests.
 * - **Errors** a 3-digit status; the body is Laravel-shaped, `{"message": "..."}` (an
 *   unauthenticated call is byte-exactly `{"message":"Unauthenticated."}`, measured live
 *   2026-10-06), plus an `errors` map on a 422.
 * - **Pagination** cursor-based on lists: `links.next`/`links.prev` are full URLs, `meta.per_page`
 *   is the page size. {@link cursorOf} lifts the `cursor` query value out of such a URL.
 */
export const API_BASE = "https://api.placid.app/api/rest";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Like {@link asOptionalJson} but the value must be present. */
export function requireJson<T>(value: unknown, label: string): T {
  const out = asOptionalJson<T>(value, label);
  if (out === undefined) throw new Error(`\`${label}\` is required`);
  return out;
}

/**
 * `passthrough` is "string or array". A string that looks like a JSON array/object is parsed;
 * anything else is sent verbatim as a string.
 */
export function looseValue(value: unknown): unknown {
  if (typeof value !== "string") return value === null ? undefined : value;
  const t = value.trim();
  if (t.startsWith("[") || t.startsWith("{")) {
    try {
      return JSON.parse(t);
    } catch { /* not JSON — send as the string it is */ }
  }
  return value === "" ? undefined : value;
}

/** Normalise a comma-separated / list param into a string list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Required string param, trimmed. */
export function required(value: unknown, label: string): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`\`${label}\` is required`);
  return s;
}

/** Base64 (optionally a `data:...;base64,` URI) to raw bytes. */
export function base64ToBytes(input: string): Uint8Array {
  const cleaned = input.includes(",") ? input.split(",", 2)[1] : input;
  const bin = atob(cleaned.trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export interface MultipartFile {
  field: string;
  filename: string;
  contentType: string;
  bytes: Uint8Array;
}

/** Build a `multipart/form-data` body by hand: text fields first, then the file parts. */
export function buildMultipart(
  fields: Record<string, string>,
  files: MultipartFile[],
): { body: Uint8Array; contentType: string } {
  const boundary = `----w6wPlacid${crypto.randomUUID().replaceAll("-", "")}`;
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const clean = (s: string) => s.replace(/["\r\n]/g, "_");
  for (const [name, value] of Object.entries(fields)) {
    parts.push(enc.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="${clean(name)}"\r\n\r\n${value}\r\n`,
    ));
  }
  for (const f of files) {
    parts.push(enc.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="${clean(f.field)}"; filename="${
        clean(f.filename)
      }"\r\nContent-Type: ${f.contentType}\r\n\r\n`,
    ));
    parts.push(f.bytes);
    parts.push(enc.encode("\r\n"));
  }
  parts.push(enc.encode(`--${boundary}--\r\n`));
  const total = parts.reduce((n, p) => n + p.length, 0);
  const body = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    body.set(p, off);
    off += p.length;
  }
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

/** `cursor` query value of a pagination link (`links.next`), or null. */
export function cursorOf(link: unknown): string | null {
  if (typeof link !== "string" || !link) return null;
  try {
    return new URL(link).searchParams.get("cursor");
  } catch {
    return null;
  }
}

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  perPage: number | null;
}

/** Fold a list response (`{data, links, meta}`, or a bare array) into one stable shape. */
export function toPage<T>(body: unknown): Page<T> {
  if (Array.isArray(body)) {
    return { data: body as T[], nextCursor: null, prevCursor: null, perPage: null };
  }
  const b = (body ?? {}) as {
    data?: T[];
    links?: { next?: string | null; prev?: string | null };
    meta?: { per_page?: number };
  };
  return {
    data: Array.isArray(b.data) ? b.data : [],
    nextCursor: cursorOf(b.links?.next),
    prevCursor: cursorOf(b.links?.prev),
    perPage: typeof b.meta?.per_page === "number" ? b.meta.per_page : null,
  };
}

function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** The vendor's own `message` (and first validation errors) out of an error body. */
export function errorText(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const b = body as { message?: unknown; errors?: unknown };
  const parts: string[] = [];
  if (typeof b.message === "string") parts.push(b.message);
  if (b.errors && typeof b.errors === "object") {
    for (const [field, v] of Object.entries(b.errors as Record<string, unknown>)) {
      parts.push(`${field}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
    }
  }
  return parts.length ? parts.join("; ") : undefined;
}

/** One actionable line for a failed call, from the documented error-code table. */
export function formatPlacidError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch { /* not JSON — fall through to the raw body */ }
  const message = errorText(parsed) ?? (raw ? truncate(raw) : undefined);
  const hint: string | undefined = {
    401: "the API token is wrong, revoked, or from a different project",
    404: "not found IN THIS PROJECT — ids from another project's token 404 the same way",
    409: "the resource is still in use; see the response body for what references it",
    422: "validation failed — check required fields and the layer names against the template",
    429: "rate limited — Placid allows 60 requests/minute; back off until X-RateLimit-Reset",
    500: "Placid server error — retry; if it persists contact armin@placid.app",
  }[status];
  return truncate(
    [`Placid ${status} for ${method} ${path}`, message, hint].filter(Boolean).join(": "),
    1000,
  );
}

export class PlacidClient {
  constructor(private ctx: HookContext) {}

  /** Parse the JSON body; 204 and empty bodies resolve to `undefined`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** POST a hand-built multipart body (media and font upload). */
  async multipart<T = unknown>(
    path: string,
    fields: Record<string, string>,
    files: MultipartFile[],
  ): Promise<T> {
    const { body, contentType } = buildMultipart(fields, files);
    const res = await this.ctx.fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "content-type": contentType, accept: "application/json" },
      body: body.slice().buffer,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatPlacidError(res.status, "POST", path, detail));
    }
    return await res.json() as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
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
      throw new Error(formatPlacidError(res.status, init.method ?? "GET", path, detail));
    }
    return res;
  }
}
