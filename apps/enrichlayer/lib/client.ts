import type { HookContext } from "@w6w/types";

/** Base of the v2 API as documented at enrichlayer.com/docs (every curl example uses this root). */
export const API_URL = "https://enrichlayer.com/api/v2";

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Build `?a=1&b=2`, skipping unset, null and empty values (0 and false are kept). */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/**
 * Enrich Layer's error envelope: `{ code, description, name }`, where `code` is the HTTP
 * status as a number and `name` its reason phrase, e.g.
 * `{"code":401,"description":"Invalid API key","name":"Unauthorized"}`.
 */
export interface EnrichLayerErrorBody {
  code?: number;
  description?: string;
  name?: string;
}

/** One human line from a parsed error body. */
export function errorText(body: unknown, raw = ""): string {
  const e = body as EnrichLayerErrorBody | null;
  if (e && (e.description || e.name)) {
    return e.name ? `${e.description ?? ""} (${e.name})`.trim() : e.description!;
  }
  return raw.trim().slice(0, 200);
}

/**
 * Pull one query parameter out of a `next_page` / `next_page_api_url` link. Paginated
 * responses hand back a full URL, never a bare token; the follow-up request takes the
 * token (`next_token`, `after`, `pagination`), not the URL. Job Search's link is also
 * an `http://enrichlayer.com/api/pc/...` URL, which is not this API's path, so the token
 * is the only usable part. Returns null on the last page (`next_page: null`).
 */
export function nextCursor(link: string | null | undefined, param: string): string | null {
  if (!link) return null;
  try {
    return new URL(link, API_URL).searchParams.get(param);
  } catch {
    return null;
  }
}

/**
 * Thin client over `https://enrichlayer.com/api/v2`. Credentials are never handled
 * here: the runtime routes every `ctx.fetch` through the Auth `sign` hook, which
 * stamps `Authorization: Bearer <key>`.
 */
export class EnrichLayerClient {
  constructor(private readonly ctx: HookContext) {}

  async get<T = unknown>(path: string, query?: Query): Promise<T> {
    const res = await this.ctx.fetch(`${API_URL}${path}${buildQuery(query)}`, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch { /* non-JSON body: reported below if the request failed */ }
    }
    if (!res.ok) {
      throw new Error(
        `Enrich Layer GET ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}`,
      );
    }
    return (parsed ?? {}) as T;
  }
}
