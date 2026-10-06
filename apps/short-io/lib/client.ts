import type { HookContext, OutputField } from "@w6w/types";

/**
 * Short.io REST client.
 *
 * Verified 2026-10-06 against Short.io's own OpenAPI 3.1 document
 * (`https://api.short.io/openapi.json`, 71 paths, `info.version` 1.0.0): one
 * server, `https://api.short.io`, one security scheme (`apiKey`, in the
 * `Authorization` header, no prefix). Paths carry no version segment.
 *
 * Credentials are never set here — the request goes through the auth `sign`
 * hook, which stamps `Authorization`.
 */
export const API_BASE = "https://api.short.io";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Short.io answers errors in two shapes, depending on the route:
 * `{"statusCode":401,"error":"Unauthorized","message":"Unauthorized"}` (Fastify)
 * and `{"error":"Unauthorized"}` / `{"success":false,"error":"..."}`. Both are
 * read; the message wins when both are present.
 */
export function describeError(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const b = body as { message?: unknown; error?: unknown };
    if (typeof b.message === "string" && b.message) return b.message;
    if (typeof b.error === "string" && b.error) return b.error;
  }
  return fallback;
}

export class ShortClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    let parsed: unknown = undefined;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch { /* non-JSON body */ }
    }
    if (!res.ok) {
      throw new Error(
        `Short.io ${res.status} for ${method} ${url.pathname}: ${
          describeError(parsed, text.slice(0, 200) || res.statusText)
        }`,
      );
    }
    return parsed as T;
  }
}

/** Drop undefined/empty-string members so optional inputs are not sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** The link object common to create / get / update / list / expand / duplicate. */
export interface ShortLink {
  idString: string;
  originalURL: string;
  shortURL?: string;
  secureShortURL?: string;
  path?: string | null;
  title?: string;
  tags?: string[];
  archived?: boolean;
  DomainId?: number;
  FolderId?: string | null;
  createdAt?: string;
  [k: string]: unknown;
}

/**
 * Shared output declaration for every action that returns one link. Never
 * includes `password`: the link object echoes it back if one was set, and the
 * actions below delete it before returning.
 */
export function stripPassword<T extends Record<string, unknown>>(link: T): T {
  if (link && typeof link === "object" && "password" in link) {
    const { password: _p, ...rest } = link;
    return rest as T;
  }
  return link;
}

export const LINK_OUTPUT: OutputField[] = [
  { key: "idString", type: "string", label: "Link ID" },
  { key: "originalURL", type: "string", label: "Destination URL" },
  { key: "shortURL", type: "string", label: "Short URL" },
  { key: "secureShortURL", type: "string", label: "Secure short URL" },
  { key: "path", type: "string", label: "Path (slug)" },
  { key: "title", type: "string", label: "Title" },
  { key: "tags", type: "array", label: "Tags" },
  { key: "archived", type: "boolean", label: "Archived" },
  { key: "DomainId", type: "number", label: "Domain ID" },
  { key: "createdAt", type: "string", label: "Created at" },
];
