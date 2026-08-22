import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Cloudinary's **Admin API** and **Upload API**, both under
 * `https://api.cloudinary.com/v1_1/{cloud_name}/…`.
 *
 * Cloudinary publishes no OpenAPI document, so every path, parameter and
 * behaviour here was taken from its reference documentation
 * (<https://cloudinary.com/documentation/admin_api>,
 * <https://cloudinary.com/documentation/upload_images>) and **verified against
 * the live host** on 2026-08-18 — which caught one thing the documentation gets
 * wrong, see `asset-search`.
 *
 * ## Three hosts, one per datacenter
 *
 * A Cloudinary product environment lives in one datacenter, and the API host
 * follows it:
 *
 *   - `api.cloudinary.com` — US (the default)
 *   - `api-eu.cloudinary.com` — EU
 *   - `api-ap.cloudinary.com` — Asia-Pacific
 *
 * All three answer (verified 2026-08-18), and calling the wrong one for your
 * cloud fails authentication rather than redirecting. So the region is part of
 * the credential, and it is also what lets this app's `service` health check
 * watch **the right third** of Cloudinary's region-partitioned status page.
 *
 * ## One credential, two APIs
 *
 * The Admin API documents HTTP Basic (`api_key:api_secret`). The Upload API
 * documents a per-request SHA-1 `signature` over the sorted parameters —
 * which an App cannot compute, because the sandbox lets only the auth `sign`
 * hook near a credential and the signature depends on the request body.
 *
 * Measured 2026-08-18: **the Upload API accepts Basic auth too.** Posting to
 * `/v1_1/demo/image/upload` with a bogus Basic credential answers
 * `{"error":{"message":"unknown api_key"}}` — it evaluated the credential —
 * rather than complaining about a missing signature, which is what an unsigned
 * request without Basic gets (`"Upload preset must be whitelisted for unsigned
 * uploads"`). So uploads work here with the same connection as everything else,
 * and no secret ever leaves the `sign` hook.
 */
export const REGION_HOSTS: Record<string, string> = {
  us: "https://api.cloudinary.com",
  eu: "https://api-eu.cloudinary.com",
  ap: "https://api-ap.cloudinary.com",
};

/**
 * The host that serves transformed assets.
 *
 * **This app never fetches it.** `asset-url` assembles a delivery URL and
 * returns it as a value for something else — a browser, an email, a downstream
 * step — to request. It is therefore deliberately NOT in the manifest's
 * `network.allow`: adding it would grant egress the app does not use, and the
 * allowlist is a statement about what this code calls. A test asserts nothing
 * here fetches it.
 */
export const DELIVERY_HOST = "res.cloudinary.com";
export const DELIVERY_BASE = `https://${DELIVERY_HOST}`;

/** Public (redacted-safe) connection metadata. */
export interface CloudinaryConnectionDisplay {
  cloudName?: string;
  region?: string;
}

export function displayOf(connection: RedactedConnection | undefined): CloudinaryConnectionDisplay {
  return (connection?.display ?? {}) as CloudinaryConnectionDisplay;
}

/** The API host for a region name, defaulting to the US datacenter. */
export function hostForRegion(region: string | undefined): string {
  const key = String(region ?? "").trim().toLowerCase();
  return REGION_HOSTS[key] ?? REGION_HOSTS.us;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
  /**
   * Sends the body as `application/x-www-form-urlencoded` instead of JSON.
   * The Upload API's routes take form encoding, and arrays go as repeated keys
   * or as a comma-joined string depending on the field — see `form()`.
   */
  form?: boolean;
}

/** Drop keys the caller left unset, so an update does not clear untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * Cloudinary's `context` and structured `metadata` are sent as a **pipe-joined
 * `key=value` string**, not as JSON — `alt=A photo|caption=Hello`. A JSON
 * object there is accepted and stored as one meaningless value, which is the
 * kind of failure nobody notices until the field is read back.
 */
export function contextString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  // A string that is not a JSON object is taken to be Cloudinary's own form
  // already — `alt=Hero|caption=Hi` — and passed through untouched.
  if (typeof value === "string" && !/^[{[]/.test(value.trim())) return value;
  const parsed = json(value, field);
  if (parsed === undefined) return undefined;
  if (typeof parsed === "string") return parsed;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`\`${field}\` must be an object of key/value pairs`);
  }
  const pairs = Object.entries(parsed as Record<string, unknown>).map(([k, v]) => {
    const text = String(v);
    if (k.includes("=") || k.includes("|")) {
      throw new Error(`\`${field}\` key "${k}" cannot contain \`=\` or \`|\``);
    }
    if (text.includes("|")) {
      throw new Error(`\`${field}\` value for "${k}" cannot contain \`|\` — it is the separator`);
    }
    return `${k}=${text}`;
  });
  return pairs.length ? pairs.join("|") : undefined;
}

/** `resource_type` — the segment that decides which half of the library you are in. */
export const RESOURCE_TYPES = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video — also audio" },
  { value: "raw", label: "Raw — any other file" },
];

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class CloudinaryClient {
  readonly base: string;
  readonly cloudName: string;

  constructor(private ctx: HookContext) {
    const display = displayOf(ctx.connection);
    this.cloudName = String(display.cloudName ?? "");
    this.base = `${hostForRegion(display.region)}/v1_1/${encodeURIComponent(this.cloudName)}`;
    if (!this.cloudName) {
      throw new Error(
        "this connection has no cloud name — reconnect the Cloudinary account so the cloud " +
          "name is stored on it",
      );
    }
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(`${k}[]`, String(item));
      } else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      if (options.form) {
        headers["content-type"] = "application/x-www-form-urlencoded";
        init.body = form(options.body as Record<string, unknown>);
      } else {
        headers["content-type"] = "application/json";
        init.body = JSON.stringify(options.body);
      }
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Cloudinary answers an API error with `{"error":{"message":"…"}}` and
      // repeats it in an `X-Cld-Error` header — but an unknown PATH answers a
      // 404 HTML page instead (measured 2026-08-18), so the body is not always
      // JSON and the header is the more reliable of the two.
      const headerError = res.headers.get("x-cld-error");
      const text = await res.text().catch(() => "");
      let detail = headerError ?? "";
      if (!detail) {
        try {
          detail = (JSON.parse(text) as { error?: { message?: string } })?.error?.message ?? "";
        } catch { /* not JSON — probably Cloudinary's 404 page */ }
      }
      if (!detail) {
        detail = text.trimStart().startsWith("<")
          ? "Cloudinary answered an HTML page — the path is probably not an API route"
          : text.slice(0, 200);
      }
      throw new Error(
        `Cloudinary ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Cloudinary's `next_cursor` paging, collecting one field.
   *
   * Every list endpoint uses the same shape — a named array plus a
   * `next_cursor` that is absent on the last page — but the array's key differs
   * per endpoint (`resources`, `folders`, `transformations`, …), so the caller
   * names it.
   */
  async requestAll<T = unknown>(
    path: string,
    key: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let cursor: string | undefined;
    while (items.length < wantTotal) {
      const perPage = Math.min(500, Math.max(1, wantTotal - items.length));
      const body = await this.request<Record<string, unknown>>(path, {
        ...options,
        query: { ...options.query, max_results: perPage, next_cursor: cursor },
      });
      const chunk = (body?.[key] as T[]) ?? [];
      items.push(...chunk);
      cursor = body?.next_cursor as string | undefined;
      if (!cursor || chunk.length === 0) break;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}

/**
 * Encode a body as `application/x-www-form-urlencoded`, the way Cloudinary's
 * Upload API expects it: arrays become repeated `key[]` entries, objects are
 * JSON-encoded, everything else is stringified.
 */
export function form(body: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) params.append(`${k}[]`, String(item));
    } else if (typeof v === "object") {
      params.set(k, JSON.stringify(v));
    } else {
      params.set(k, String(v));
    }
  }
  return params.toString();
}
