import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Egnyte gives every customer its own host — `acme.egnyte.com`. A manifest
 * cannot enumerate those, so `w6w.network.allow` declares the wildcard
 * `*.egnyte.com`; the runtime's egress matcher accepts any subdomain of it and
 * still refuses everything else.
 *
 * The domain identifies the account, so it is an Auth field recorded on the
 * connection's redacted `display` by `afterConnect`; the client reads it from
 * there and never sees the access token (`sign` adds it).
 */
export function domainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { domain?: string };
  if (display.domain) return display.domain;
  throw new Error(
    "Egnyte connection has no domain — reconnect the account so it can be recorded.",
  );
}

/** Root of the Public API for one Egnyte domain. */
export function baseUrl(domain: string): string {
  return `https://${domain}.egnyte.com/pubapi`;
}

/**
 * Encode a file/folder path the way Egnyte requires: each segment is
 * URL-encoded separately and the `/` separators are left alone
 * (`Shared/example?path/$file.txt` → `Shared/example%3Fpath/%24file.txt`).
 * Leading and trailing slashes are dropped so `/Shared/x` and `Shared/x` agree.
 */
export function encodePath(path: string): string {
  return path
    .split("/")
    .filter((s) => s !== "")
    .map(encodeURIComponent)
    .join("/");
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: string;
  query?: Query;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class EgnyteClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(domainFromConnection(ctx.connection));
  }

  url(path: string, query: Query = {}): URL {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    return url;
  }

  private async fail(res: Response, method: string, url: URL): Promise<never> {
    // Egnyte error bodies are `{ "errorMessage": "..." }` — the body is where
    // the actionable part is.
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Egnyte ${res.status} ${res.statusText} for ${method} ${url.pathname}: ${detail}`,
    );
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.url(path, options.query);
    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) return await this.fail(res, method, url);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** POST raw bytes (file upload). Returns the response headers with the body. */
  async upload(
    path: string,
    bytes: Uint8Array,
    headers: Record<string, string> = {},
  ): Promise<{ status: number; headers: Headers; body: unknown }> {
    const url = this.url(path);
    const res = await this.ctx.fetch(url.toString(), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/octet-stream",
        ...headers,
      },
      body: bytes as unknown as BodyInit,
    });
    if (!res.ok) return await this.fail(res, "POST", url);
    const text = await res.text();
    let body: unknown = undefined;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    return { status: res.status, headers: res.headers, body };
  }

  /** GET raw bytes (file download). */
  async download(
    path: string,
    query: Query = {},
  ): Promise<{ bytes: Uint8Array; headers: Headers }> {
    const url = this.url(path, query);
    const res = await this.ctx.fetch(url.toString(), { method: "GET" });
    if (!res.ok) return await this.fail(res, "GET", url);
    return { bytes: new Uint8Array(await res.arrayBuffer()), headers: res.headers };
  }
}
