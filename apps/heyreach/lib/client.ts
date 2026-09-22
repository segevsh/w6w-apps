import type { HookContext } from "@w6w/types";

/**
 * HeyReach public API client.
 *
 * Everything in this module comes from HeyReach's own OpenAPI 3.1 document
 * (`https://docs.heyreach.io/openapi.json`, 256,166 bytes, fetched and read in
 * full on 2026-09-22) plus live probes against `https://api.heyreach.io` on the
 * same day. Nothing here came from a third-party integration directory.
 *
 * ## One host, one prefix — and the spec's `servers[0]` is wrong
 *
 * The document declares exactly one server, and its `url` is the truncated
 * string `"https://api"` — not usable verbatim. The live host is
 * `https://api.heyreach.io`, and every one of the document's 87 paths is
 * prefixed `/api/public/...` (the document's own path keys arrive *doubled*,
 * `//api/public/...`, which the live host treats as a single slash). The
 * canonical form used here is `https://api.heyreach.io/api/public/...`,
 * confirmed by live request.
 *
 * ## Authentication is not done here
 *
 * This client never sets a credential header. The runtime routes each request
 * through the auth `sign` hook, which stamps `X-API-KEY` — no Action ever sees
 * the key, and no path puts it in a URL.
 *
 * ## Paging lives in the POST body, not the query string
 *
 * Unusual, and the single most common way to get a HeyReach list wrong: the
 * collection endpoints are `POST` and take `{ offset, limit, ...filters }` as a
 * **JSON body**. Only the by-id reads (`GetById`, `GetAccountStatus`,
 * `GetCampaignSequence`) and the campaign state changes
 * (`StartCampaign`/`Pause`/`Resume`) take a query parameter. `inbox/
 * GetConversationsV3` is cursor-paged instead of offset-paged.
 *
 * ## Errors: a JSON envelope on 4xx, a bare string on 401
 *
 * `400`/`404` answer `{"errorMessage": "..."}`. But **401 answers plain text** —
 * `Missing API key` or `Invalid API key` — despite the document declaring a JSON
 * error schema for it. A client that calls `res.json()` on a 401 therefore
 * throws on the one response it most needs to read, so
 * {@link formatHeyReachError} reads the text and only then tries JSON.
 *
 * ## The document's request-body schemas mark everything `required`
 *
 * Every property of every request body is listed in `required` — including
 * `keyword`, which the same operation's own prose describes as optional. That
 * list is a generator artifact, not a contract; this app sends the fields the
 * prose describes as required and omits the rest.
 */

/** The one host. `network.allow` declares exactly this and nothing else. */
export const API_BASE = "https://api.heyreach.io";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/api/public";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Serialized onto the URL (the by-id reads and campaign state changes). */
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/**
 * Drop the keys a caller left unset.
 *
 * `false` and `0` survive — `seen: false` and `offset: 0` are both meaningful,
 * and an empty string is dropped because HeyReach's own filters treat it as
 * absent rather than as a search for nothing.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at each call site.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/**
 * Normalise an id list into the integer array HeyReach's bodies expect.
 *
 * A `multiselect`/`array` param arrives as an array, but a hand-typed field
 * arrives as a comma-separated string — both are accepted, and a non-integer
 * entry is rejected here rather than shipped as `NaN`.
 */
export function numberList(value: unknown, label: string): number[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const items = (Array.isArray(value) ? value : String(value).split(","))
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (items.length === 0) return undefined;
  return items.map((raw) => {
    const n = Number(raw);
    if (!Number.isInteger(n)) throw new Error(`${label}: \`${raw}\` is not an integer`);
    return n;
  });
}

/** Normalise a string list into the array HeyReach's bodies expect. */
export function stringList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const items = (Array.isArray(value) ? value : String(value).split(","))
    .map((v) => String(v).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Keep an error message readable — a validation body can quote a whole node. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn a HeyReach failure into something actionable.
 *
 * The two shapes that matter:
 *
 *  - `400`/`403`/`404` — `{"errorMessage": "..."}` (a few operations answer
 *    `{"detail": ...}` instead).
 *  - `401` — **plain text**, `Missing API key` or `Invalid API key`. Not JSON,
 *    whatever the document's `UnauthorizedErrorBody` claims. The text is the
 *    only thing that separates "no key reached the request" from "the key is
 *    wrong", so it is surfaced verbatim rather than replaced by the status.
 */
export function formatHeyReachError(
  status: number,
  method: string,
  path: string,
  text: string,
): string {
  let detail = text.trim();
  if (detail) {
    try {
      const parsed = JSON.parse(detail) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        const message = parsed.errorMessage ?? parsed.detail ?? parsed.title;
        if (typeof message === "string") detail = message;
      }
    } catch {
      // Not JSON — which is the documented shape of a 401. Keep the text.
    }
  }

  const parts = [`HeyReach ${status} for ${method} ${path}`];
  if (detail) parts.push(truncate(detail));
  if (status === 401) {
    parts.push(
      /invalid api key/i.test(detail)
        ? "the API key was rejected — check it was copied exactly and has not been regenerated " +
          "in HeyReach under Settings > API"
        : "the request carried no key the API recognised — reconnect this connection",
    );
  }
  if (status === 429) {
    parts.push("HeyReach is rate-limiting this key — slow the workflow down and retry");
  }
  return parts.join(": ");
}

export class HeyReachClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { res, url } = await this.send(path, options);
    const text = await res.text().catch(() => "");
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `HeyReach did not return JSON for ${url.pathname}: ${truncate(text, 160)}`,
      );
    }
  }

  /** Status only, for the endpoints whose documented response body is empty. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const { res } = await this.send(path, options);
    await res.body?.cancel();
    return res.status;
  }

  private async send(
    path: string,
    options: RequestOptions,
  ): Promise<{ res: Response; url: URL; method: string }> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
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
    const method = init.method ?? "GET";

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Read as TEXT, never as JSON: HeyReach's 401 is a bare string, and the
      // body text is the only thing that separates a missing key from a wrong one.
      const text = await res.text().catch(() => "");
      throw new Error(formatHeyReachError(res.status, method, url.pathname, text));
    }
    return { res, url, method };
  }
}
