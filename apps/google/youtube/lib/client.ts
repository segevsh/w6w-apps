import type { HookContext, Param } from "@w6w/types";

/**
 * YouTube Data API v3.
 *
 * The canonical service host is `youtube.googleapis.com` — that is the
 * `rootUrl` in the live discovery document
 * (`https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest`, revision
 * `20260729`), and `youtube/v3` is the per-method path prefix, so the base is
 * the two concatenated.
 *
 * The older `https://www.googleapis.com/youtube/v3` alias still resolves and is
 * what most third-party tutorials show, but it is NOT what Google publishes, and
 * `www.googleapis.com` is the generic front door for every Google API. Naming it
 * in `w6w.network.allow` would widen this app's egress to all of Google for no
 * benefit, so this app targets the dedicated host and allowlists only that.
 * (`www.googleapis.com` does appear in `auth/oauth2.ts`, but only as the
 * namespace OAuth scope *identifiers* are spelled in — it is never fetched.)
 */
export const API_URL = "https://youtube.googleapis.com/youtube/v3";

/**
 * The `part` parameter — the thing this API is most often got wrong.
 *
 * Nearly every YouTube endpoint requires `part`, and it does three jobs at once:
 *
 *   1. **It is mandatory.** Omitting it is a 400 `missingRequiredParameter`, not
 *      a defaulted request. Every action here therefore exposes `part` as a real
 *      parameter with a sensible default rather than hardcoding one value.
 *   2. **It selects the response shape.** A resource is returned with exactly
 *      the requested top-level parts and no others, so `part=id` and
 *      `part=snippet,statistics` return genuinely different objects.
 *   3. **On write methods it also selects what gets written.** `videos.update`
 *      with `part=snippet` overwrites *every* mutable field in `snippet`,
 *      including ones absent from the request body. That is why the write
 *      actions here derive `part` from what the caller actually supplied
 *      instead of sending a fixed list.
 *
 * Values below are the documented ones for each resource, verified against both
 * the discovery document's schema properties and the HTML reference pages.
 * `etag` and `kind` are response fields, not parts, and are excluded.
 */
export const PARTS = {
  /** https://developers.google.com/youtube/v3/docs/videos/list */
  video: [
    "id",
    "snippet",
    "contentDetails",
    "statistics",
    "status",
    "player",
    "topicDetails",
    "recordingDetails",
    "liveStreamingDetails",
    "localizations",
    "fileDetails",
    "processingDetails",
    "suggestions",
    "paidProductPlacementDetails",
    "brandPartner",
  ],
  /** https://developers.google.com/youtube/v3/docs/channels/list */
  channel: [
    "id",
    "snippet",
    "contentDetails",
    "statistics",
    "status",
    "brandingSettings",
    "topicDetails",
    "localizations",
    "contentOwnerDetails",
    "auditDetails",
  ],
  /** https://developers.google.com/youtube/v3/docs/playlists/list */
  playlist: ["id", "snippet", "contentDetails", "status", "player", "localizations"],
  /** https://developers.google.com/youtube/v3/docs/playlistItems/list */
  playlistItem: ["id", "snippet", "contentDetails", "status"],
  /** https://developers.google.com/youtube/v3/docs/commentThreads/list */
  commentThread: ["id", "snippet", "replies"],
  /** https://developers.google.com/youtube/v3/docs/comments/list */
  comment: ["id", "snippet"],
  /** https://developers.google.com/youtube/v3/docs/subscriptions/list */
  subscription: ["id", "snippet", "contentDetails", "subscriberSnippet"],
  /** https://developers.google.com/youtube/v3/docs/search/list */
  searchResult: ["id", "snippet"],
} as const satisfies Record<string, readonly string[]>;

export type PartResource = keyof typeof PARTS;

/**
 * Build the `part` Param for an action, so every action models it identically
 * and none of them can drift out of the documented value set.
 */
export function partParam(
  resource: PartResource,
  defaultParts: string,
  hint?: string,
): Param {
  return {
    key: "part",
    label: "Part",
    type: "multiselect",
    required: true,
    default: defaultParts,
    options: PARTS[resource].map((p) => ({ value: p, label: p })),
    hint: hint ??
      `Which top-level resource sections to return. Required by the API and it drives the quota cost — request only what you need.`,
  };
}

/**
 * Normalise a `part` input to the comma-separated string the API expects.
 *
 * Accepts either a `multiselect` array or a hand-typed string, tolerates
 * whitespace, drops empties and de-duplicates while preserving order. Order is
 * preserved rather than sorted because the API echoes it and callers diffing
 * request URLs should see what they asked for.
 *
 * Throws on an empty result: `part` is required, and a request without it fails
 * server-side with a less obvious error than this one.
 */
export function normalizePart(part: string | readonly string[] | undefined): string {
  const raw = Array.isArray(part) ? part : String(part ?? "").split(",");
  const seen = new Set<string>();
  for (const entry of raw) {
    const trimmed = String(entry).trim();
    if (trimmed) seen.add(trimmed);
  }
  if (seen.size === 0) {
    throw new Error("YouTube: `part` is required and must name at least one resource part");
  }
  return [...seen].join(",");
}

/**
 * Serialise a repeated parameter (`id`, `type`, …). The YouTube API takes these
 * as one comma-separated value, not as repeated query keys.
 */
export function csv(value: string | readonly string[] | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const list = Array.isArray(value) ? value : String(value).split(",");
  const out = list.map((v) => String(v).trim()).filter(Boolean);
  return out.length > 0 ? out.join(",") : undefined;
}

export interface RequestOptions {
  method?: string;
  /**
   * The `part` value. Always serialised first so it is unmissable in a request
   * URL, and validated so a missing one fails here rather than at Google.
   */
  part?: string | readonly string[];
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON object → JSON-encoded body. `undefined`/`null` → no body. */
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`. Auth is applied by the runtime through the
 * auth `sign` hook, so this never touches the Authorization header or the API
 * key — an action must not be able to see a credential.
 */
export class YouTubeClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);

    if (options.part !== undefined) {
      url.searchParams.set("part", normalizePart(options.part));
    }
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    let body: BodyInit | undefined;
    if (options.body !== undefined && options.body !== null) {
      headers["content-type"] = "application/json";
      body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    const init: RequestInit = { method: options.method ?? "GET", headers, body };
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `YouTube ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    // The delete methods document an empty 204. Read as text first so an empty
    // 200 is handled as safely as a 204.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
