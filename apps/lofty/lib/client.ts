import type { HookContext } from "@w6w/types";

/**
 * Lofty Open API 1.0 client.
 *
 * Everything here comes from the OpenAPI 3.0.1 specification embedded in
 * <https://api.lofty.com/docs/> (extracted and verified 2026-09-22), which
 * declares exactly one server, `https://api.lofty.com`, and one path prefix,
 * `/v1.0`.
 *
 * ## Authentication is not done here
 *
 * This client never sets an `Authorization` header. The runtime routes each
 * request through the auth `sign` hook, which stamps `Authorization: token
 * <key>` — the literal lowercase `token ` prefix Lofty documents, which is why
 * a generic `apiKey` injection would be wrong. No action ever sees the key.
 *
 * ## Errors are a JSON *string*, not an object
 *
 * Lofty's `400`/`401`/`500` bodies are a plain JSON string per the spec
 * (`"<error message>"`), not `{"error": …}`. {@link formatLoftyError} unwraps
 * that to the message so an error a workflow catches reads as words rather than
 * a quoted blob, and keeps the raw body when it is something else.
 *
 * ## Query parameters are flat
 *
 * Every documented query parameter is a `string`, `integer` or `boolean`; the
 * places the spec calls a list (`groups`, `segments`, `allTags`, `anyTags`,
 * `groupIds`) are exposed as comma-separated form fields, so the client only
 * ever writes scalar values onto the URL.
 */

/** The single documented server. */
export const API_BASE = "https://api.lofty.com";

/** Every selected operation carries this prefix. */
export const API_PREFIX = "/v1.0";

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `desc=false` and `offset=0` are both meaningful, and
 * silently dropping them would make them impossible to express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Split a comma-separated form field into a list, or leave it unset.
 *
 * Lofty's body fields take real JSON arrays (`emails`, `tags`, …) while its
 * query parameters take one string, so the form surfaces both as a
 * comma-separated text field and this is where that becomes an array.
 */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Same as {@link csv}, but each entry must be an integer. */
export function intList(v: unknown): number[] | undefined {
  const items = csv(v);
  if (!items) return undefined;
  return items.map((raw) => {
    const n = Number(raw);
    if (!Number.isInteger(n)) throw new Error(`\`${raw}\` is not an integer`);
    return n;
  });
}

/**
 * Accept a `json` param as the value the caller supplied.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * a parsed value and the raw string are handled here rather than at each call
 * site.
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

/**
 * Turn Lofty's flat error body into something actionable.
 *
 * The documented failure shape for `400`/`401`/`500` is a JSON string
 * (`"<error message>"`), so the useful text is one `JSON.parse` away. Anything
 * that is not such a string is passed through verbatim.
 */
export function formatLoftyError(
  status: number,
  method: string,
  path: string,
  text: string,
): string {
  let detail = text.trim();
  if (detail) {
    try {
      const parsed = JSON.parse(detail) as unknown;
      if (typeof parsed === "string") detail = parsed;
    } catch {
      // Not JSON — keep the body as served.
    }
  }
  const parts = [`Lofty ${status} for ${method} ${path}`];
  if (detail) parts.push(detail.slice(0, 600));
  if (status === 401) {
    parts.push(
      "the API key was rejected — check it was copied exactly and has not been " +
        "rotated in Lofty under Settings > Integrations > API",
    );
  }
  return parts.join(": ");
}

export class LoftyClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { res, url } = await this.send(path, options);
    const text = await res.text().catch(() => "");
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Lofty did not return JSON for ${url.pathname}: ${text.slice(0, 160)}`);
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
      const text = await res.text().catch(() => "");
      throw new Error(formatLoftyError(res.status, method, url.pathname, text));
    }
    return { res, url, method };
  }
}
