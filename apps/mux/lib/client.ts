import type { HookContext } from "@w6w/types";

/**
 * Mux's **Video** and **Data** APIs.
 *
 * Paths come from Mux's reference (`docs.mux.com/api-reference`) and every one
 * this app calls was verified to route against `api.mux.com` on 2026-08-18.
 * Its error shape was measured the same day:
 * `{"error":{"type":"unauthorized","messages":["Unauthorized request"]}}`.
 *
 * ## Two APIs, one host, one credential
 *
 * `/video/v1/*` manages assets, live streams and playback; `/data/v1/*` answers
 * questions about how those were watched. They share a host and an access
 * token, but they answer different questions and are metered separately.
 *
 * ## The delivery hosts are never called
 *
 * A Mux video is watched at `stream.mux.com/{playbackId}.m3u8` and its
 * thumbnails come from `image.mux.com`. Those are **not** API hosts: this app
 * assembles those URLs and returns them for a player, an email or a downstream
 * step to fetch. They are deliberately absent from the egress allowlist, since
 * the app never requests them, and a test asserts it.
 */
export const BASE_URL = "https://api.mux.com";

/**
 * Where a Mux video is watched. Assembled, never fetched — see the note above.
 */
export const STREAM_HOST = "stream.mux.com";
export const IMAGE_HOST = "image.mux.com";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
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
 * A playback policy.
 *
 * `public` means anyone with the playback id can watch. `signed` means a viewer
 * needs a **JWT signed with one of the account's signing keys** — which this
 * app cannot produce, because signing requires the private key and only the
 * auth hook may hold a credential. Actions offering the choice say so rather
 * than minting an id nobody can use.
 */
export const PLAYBACK_POLICIES = [
  { value: "public", label: "Public — anyone with the playback ID can watch" },
  { value: "signed", label: "Signed — viewers need a JWT this app cannot mint" },
];

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class MuxClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
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
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Mux ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text, res.headers)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    // Every Mux response wraps its payload in `data`.
    return JSON.parse(text) as T;
  }

  /**
   * Follow Mux's `page`/`limit` paging, unwrapping the `data` envelope.
   *
   * Mux answers `{"data": [...]}` on every list, and pages are 1-based. A page
   * shorter than requested is the end; there is no total.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    while (items.length < wantTotal) {
      const limit = Math.min(100, Math.max(1, wantTotal - items.length));
      const body = await this.request<{ data?: T[] }>(path, {
        ...options,
        query: { ...options.query, page, limit },
      });
      const chunk = body?.data ?? [];
      items.push(...chunk);
      if (chunk.length === 0 || chunk.length < limit) break;
      page += 1;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}

/**
 * Turn a Mux error into something actionable.
 *
 * Mux answers `{"error":{"type","messages":[]}}` — the `messages` array being
 * the half that names the field. `x-request-id` is on every response and is
 * what Mux support asks for, so it is carried through.
 */
export function describeError(status: number, text: string, headers?: Headers): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { error?: { type?: string; messages?: string[] } };
    const error = body?.error;
    if (error) {
      const messages = (error.messages ?? []).join("; ");
      detail = [error.type, messages].filter(Boolean).join(": ");
    }
  } catch { /* not JSON */ }

  const requestId = headers?.get("x-request-id");
  const suffix = requestId ? ` (x-request-id ${requestId})` : "";

  if (status === 401) {
    return `${detail} — check the Access Token ID and Secret Key, and that the token has the ` +
      `permissions this call needs${suffix}`;
  }
  if (status === 429) {
    return `${detail} — rate limited; Mux meters per endpoint group${suffix}`;
  }
  return `${detail || status}${suffix}`;
}

/**
 * Build the HLS URL a player uses.
 *
 * Assembled locally rather than fetched: it is a value for something else to
 * request, and `stream.mux.com` is deliberately outside this app's allowlist.
 */
export function streamUrl(playbackId: string): string {
  return `https://${STREAM_HOST}/${encodeURIComponent(playbackId)}.m3u8`;
}

/** Build a thumbnail URL. `time` is seconds into the video. */
export function thumbnailUrl(
  playbackId: string,
  options: { time?: number; width?: number; height?: number; fitMode?: string } = {},
): string {
  const url = new URL(`https://${IMAGE_HOST}/${encodeURIComponent(playbackId)}/thumbnail.jpg`);
  if (options.time !== undefined) url.searchParams.set("time", String(options.time));
  if (options.width !== undefined) url.searchParams.set("width", String(options.width));
  if (options.height !== undefined) url.searchParams.set("height", String(options.height));
  if (options.fitMode) url.searchParams.set("fit_mode", options.fitMode);
  return url.toString();
}
