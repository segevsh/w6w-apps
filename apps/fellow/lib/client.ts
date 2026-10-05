import type { HookContext } from "@w6w/types";

/**
 * Fellow Developer API client.
 *
 * Verified 2026-10-05 against Fellow's OpenAPI 3.1 document (embedded in every
 * `developers.fellow.ai/reference/*` page, `servers[0].url` =
 * `https://{subdomain}.fellow.app`, 19 paths / 23 operations) plus live probes of
 * `{subdomain}.fellow.app/api/v1/me`.
 *
 * The API host is **per workspace** — `https://{subdomain}.fellow.app/api/v1` —
 * and the subdomain is a Connection field. It is validated as a single DNS
 * label before it is ever concatenated into a URL, so a pasted value cannot
 * redirect a request (and the credential `sign` stamps on it) to another host.
 */

export const FELLOW_DOMAIN = "fellow.app";
export const API_PATH = "/api/v1";

export interface FellowConnectionDisplay {
  subdomain?: string;
  workspaceName?: string;
}

/** Accept `acme`, `acme.fellow.app` or a pasted URL; return the bare label. */
export function normalizeSubdomain(raw: string): string {
  let sub = String(raw ?? "").trim().toLowerCase();
  sub = sub.replace(/^https?:\/\//, "");
  sub = sub.replace(/[/?#:].*$/, "");
  sub = sub.replace(/\.fellow\.app$/, "");
  return sub.replace(/^\.+|\.+$/g, "");
}

/** A single hostname label: no dots, so it can only ever sit under `.fellow.app`. */
export function isValidSubdomain(sub: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(sub);
}

export function apiHost(subdomain: string): string {
  const normalized = normalizeSubdomain(subdomain);
  if (!normalized) throw new Error("Fellow connection is missing a workspace subdomain");
  if (!isValidSubdomain(normalized)) {
    throw new Error(
      `"${normalized}" is not a Fellow workspace subdomain — expected a single label such as ` +
        `\`acme\`, the part before \`.${FELLOW_DOMAIN}\` in your Fellow URL`,
    );
  }
  return `${normalized}.${FELLOW_DOMAIN}`;
}

export function resolveApiUrl(display: FellowConnectionDisplay | undefined): string {
  return `https://${apiHost(display?.subdomain ?? "")}${API_PATH}`;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** `X-On-Behalf-Of` — a Super Admin key acting as another workspace user. */
  onBehalfOf?: string;
}

export interface PageResult<T> {
  items: T[];
  cursor: string | null;
  pageSize: number | null;
  hasMore: boolean;
}

/**
 * Fellow's error bodies are `{"detail": "..."}`; a 422/400 may carry a list. An
 * unknown subdomain is an **HTML 404**, not JSON — so a body that is not JSON
 * is reported as such rather than dumped.
 */
export function describeError(status: number, raw: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(raw) as { detail?: unknown; message?: unknown; error?: unknown };
    const d = parsed.detail ?? parsed.message ?? parsed.error;
    detail = typeof d === "string" ? d : d === undefined ? "" : JSON.stringify(d);
  } catch {
    detail = raw.trimStart().startsWith("<")
      ? "non-JSON response (HTML) — check the workspace subdomain"
      : raw.slice(0, 300);
  }
  const hint = status === 429
    ? " (rate limited: 3 requests/second and 10,000/day per API key — back off and retry)"
    : status === 401
    ? " (API key missing or invalid)"
    : status === 403
    ? " (no access: the Developer API may be disabled for the workspace, or the key's owner" +
      " cannot see this resource, or the endpoint needs a Super Admin key)"
    : "";
  return `Fellow ${status}${detail ? `: ${detail}` : ""}${hint}`;
}

export class FellowClient {
  constructor(private ctx: HookContext) {}

  private baseUrl(): string {
    return resolveApiUrl(this.ctx.connection?.display as FellowConnectionDisplay | undefined);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl()}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const onBehalfOf = options.onBehalfOf?.trim();
    if (onBehalfOf) headers["x-on-behalf-of"] = onBehalfOf;
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) throw new Error(describeError(res.status, text));
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Fellow returned a non-JSON ${res.status} body for ${url.pathname}`);
    }
  }

  /** `{ [key]: value }` envelope → `value`. */
  async unwrap<T = unknown>(key: string, path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.request<Record<string, T>>(path, options);
    const value = body?.[key];
    if (value === undefined) throw new Error(`Fellow response for ${path} had no \`${key}\``);
    return value;
  }

  /** `{ [key]: { page_info, data } }` → a flat page. */
  async page<T = unknown>(
    key: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<PageResult<T>> {
    const body = await this.request<
      Record<string, { page_info?: { cursor?: string | null; page_size?: number }; data?: T[] }>
    >(path, options);
    const page = body?.[key];
    if (!page || !Array.isArray(page.data)) {
      throw new Error(`Fellow response for ${path} had no \`${key}.data\` list`);
    }
    const cursor = page.page_info?.cursor ?? null;
    return {
      items: page.data,
      cursor,
      pageSize: page.page_info?.page_size ?? null,
      hasMore: cursor !== null,
    };
  }
}

export function encodeId(id: string): string {
  const v = String(id ?? "").trim();
  if (!v) throw new Error("id is required");
  return encodeURIComponent(v);
}

/** Drop undefined / null / empty-string entries (never `false` or `0`). */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** `undefined` unless the object has at least one key. */
export function nonEmpty(obj: Record<string, unknown>): Record<string, unknown> | undefined {
  const c = compact(obj);
  return Object.keys(c).length > 0 ? c : undefined;
}

export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Cursor pagination body: `page_size` 1–50 (default 20), `cursor` null on page one. */
export function paginationBody(
  pageSize?: number,
  cursor?: string,
): Record<string, unknown> | undefined {
  if (pageSize !== undefined && pageSize !== null) {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
      throw new Error("pageSize must be an integer from 1 to 50");
    }
  }
  return nonEmpty({ page_size: pageSize, cursor });
}

export interface MediaAuthInput {
  mediaAuthType?: string;
  mediaBearerToken?: string;
  mediaUsername?: string;
  mediaPassword?: string;
}

/**
 * Fellow's `media_auth` is a discriminated union: `{type: "bearer_token", token}`
 * or `{type: "basic_auth", username, password}`. Anything else is omitted.
 */
export function mediaAuthBody(input: MediaAuthInput): Record<string, unknown> | undefined {
  if (input.mediaAuthType === "bearer_token") {
    if (!input.mediaBearerToken) throw new Error("mediaBearerToken is required for bearer_token");
    return { type: "bearer_token", token: input.mediaBearerToken };
  }
  if (input.mediaAuthType === "basic_auth") {
    if (!input.mediaUsername || input.mediaPassword === undefined) {
      throw new Error("mediaUsername and mediaPassword are required for basic_auth");
    }
    return { type: "basic_auth", username: input.mediaUsername, password: input.mediaPassword };
  }
  return undefined;
}
