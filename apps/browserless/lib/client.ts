import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Browserless REST APIs. Verified 2026-10-06 against the vendor's own docs
 * (`docs.browserless.io/llms.txt`, the `/rest-apis/*` pages and the per-route
 * OpenAPI pages under `/open-api/*`) plus live probes of the three regional
 * hosts and of `api.browserless.io`.
 *
 * ## Regions
 *
 * Browserless Cloud answers on three fixed regional hosts — US West (San
 * Francisco), Europe (London) and Europe (Amsterdam). The region is collected
 * once on the Connection and echoed onto its redacted `display` by
 * `afterConnect`, so an Action picks a host without ever seeing the
 * credential. Only those three hosts, plus `api.browserless.io` for the usage
 * read, are ever contacted. A self-hosted Browserless is deliberately not
 * supported: its hostname is free-form, and `network.allow` cannot express it
 * without disabling egress restriction altogether.
 *
 * ## Errors
 *
 * Failures are NOT one shape. The edge answers an unauthenticated request with
 * an HTML `401 Authorization Required` page (openresty), the application
 * answers a bad token with a PLAIN-TEXT `Invalid API key. Please check your API
 * key and try again. (requestId: …)`, and `api.browserless.io` answers JSON
 * `{"error": "Invalid API token"}`. The status code is a hint; callers read the
 * body.
 */
export type Region = "sfo" | "lon" | "ams";

export const REGIONS: Region[] = ["sfo", "lon", "ams"];

export const HOSTS: Record<Region, string> = {
  sfo: "production-sfo.browserless.io",
  lon: "production-lon.browserless.io",
  ams: "production-ams.browserless.io",
};

export const REGION_LABEL: Record<Region, string> = {
  sfo: "US West (San Francisco)",
  lon: "Europe (London)",
  ams: "Europe (Amsterdam)",
};

/** The account-level host that serves the Usage API. */
export const ACCOUNT_HOST = "api.browserless.io";

export function asRegion(v: unknown): Region {
  return REGIONS.includes(v as Region) ? (v as Region) : "sfo";
}

export function regionFromConnection(connection: Partial<RedactedConnection> | undefined): Region {
  const display = (connection?.display ?? {}) as { region?: string };
  return asRegion(display.region);
}

export function regionBase(region: Region): string {
  return `https://${HOSTS[region]}`;
}

type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, Scalar>;
  /** JSON body. */
  body?: unknown;
  /** Raw body with its own content type (the `/function` JavaScript form). */
  rawBody?: { contentType: string; text: string };
  /** Send to `api.browserless.io` instead of the connection's regional host. */
  account?: boolean;
  /** Status codes that are returned to the caller instead of thrown. */
  accept?: number[];
}

export interface BinaryResult {
  contentType: string;
  sizeBytes: number;
  /** Standard base64 of the response body. */
  base64: string;
  filename?: string;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
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

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function filenameFromDisposition(header: string | null): string | undefined {
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header ?? "");
  return m ? decodeURIComponent(m[1]) : undefined;
}

export interface AnyBody {
  contentType: string;
  sizeBytes: number;
  /** Parsed JSON, when the response is `application/json`. */
  data?: unknown;
  /** Body text, for text-like content types (HTML, plain text, XML, JS). */
  text?: string;
  /** Standard base64, for every other (binary) content type. */
  base64?: string;
  filename?: string;
}

function mediaType(contentType: string): string {
  return contentType.split(";")[0].trim().toLowerCase();
}

export function isJsonType(contentType: string): boolean {
  const t = mediaType(contentType);
  return t === "application/json" || t.endsWith("+json");
}

export function isTextType(contentType: string): boolean {
  const t = mediaType(contentType);
  return t.startsWith("text/") || t.endsWith("+xml") ||
    ["application/xml", "application/javascript", "application/x-ndjson"].includes(t);
}

/** Routes whose response type depends on what the caller asked for (`/function`, `/export`). */
export async function readBody(res: Response): Promise<AnyBody> {
  const contentType = res.headers.get("content-type") ?? "";
  const filename = filenameFromDisposition(res.headers.get("content-disposition"));
  const bytes = new Uint8Array(await res.arrayBuffer());
  const out: AnyBody = { contentType, sizeBytes: bytes.length };
  if (filename) out.filename = filename;
  if (isJsonType(contentType)) {
    const text = new TextDecoder().decode(bytes);
    try {
      out.data = JSON.parse(text);
    } catch {
      out.text = text;
    }
  } else if (isTextType(contentType)) {
    out.text = new TextDecoder().decode(bytes);
  } else {
    out.base64 = toBase64(bytes);
  }
  return out;
}

/** Pulls the vendor's message out of whichever of its three error shapes arrived. */
export function errorText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const msg = parsed?.error ?? parsed?.message;
    if (typeof msg === "string") return msg;
    if (msg && typeof msg === "object") return JSON.stringify(msg);
  } catch { /* plain text or HTML */ }
  if (/^\s*<(!doctype|html)/i.test(trimmed)) {
    const title = /<title>([^<]*)<\/title>/i.exec(trimmed)?.[1];
    return title ?? "HTML error page";
  }
  return trimmed;
}

export function formatError(status: number, method: string, path: string, raw: string): string {
  const text = errorText(raw);
  const hint = status === 401
    ? " — the token was rejected or never reached the request; reconnect this connection"
    : status === 408
    ? " — the page took longer than the request timeout; raise `timeout` or set `bestAttempt`"
    : status === 429
    ? " — every browser slot on the plan is busy; retry with backoff"
    : status === 403
    ? " — the target is not allowed, or the plan does not include this endpoint"
    : "";
  return truncate(`Browserless ${status} for ${method} ${path}: ${text}${hint}`, 1000);
}

export class BrowserlessClient {
  constructor(private ctx: HookContext) {}

  get region(): Region {
    return regionFromConnection(this.ctx.connection);
  }

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Browserless ${res.status} for ${path}: expected JSON, got ${truncate(text, 200)}`,
      );
    }
  }

  async text(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ text: string; contentType: string }> {
    const res = await this.send(path, options);
    return { text: await res.text(), contentType: res.headers.get("content-type") ?? "" };
  }

  async binary(path: string, options: RequestOptions = {}): Promise<BinaryResult> {
    const res = await this.send(path, { ...options });
    const bytes = new Uint8Array(await res.arrayBuffer());
    return {
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
      sizeBytes: bytes.length,
      base64: toBase64(bytes),
      filename: filenameFromDisposition(res.headers.get("content-disposition")),
    };
  }

  /** The raw response, for callers that branch on content type. */
  async response(path: string, options: RequestOptions = {}): Promise<Response> {
    return await this.send(path, options);
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const base = options.account ? `https://${ACCOUNT_HOST}` : regionBase(this.region);
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const method = options.method ??
      (options.body !== undefined || options.rawBody ? "POST" : "GET");
    const headers: Record<string, string> = {};
    const init: RequestInit = { method, headers };
    if (options.rawBody) {
      headers["content-type"] = options.rawBody.contentType;
      init.body = options.rawBody.text;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    // No token here: the Auth `sign` hook adds `?token=` to every request.
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok && !(options.accept ?? []).includes(res.status)) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatError(res.status, method, url.pathname, detail));
    }
    return res;
  }
}
