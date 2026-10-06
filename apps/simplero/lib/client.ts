import type { HookContext } from "@w6w/types";

/**
 * Simplero API v2 client.
 *
 * Every host, path, parameter and body shape in this app is transcribed from Simplero's own
 * OpenAPI 3.1.0 document (`https://simplero.com/api/v2/docs/openapi.json`, `info.version` "v2",
 * 682 paths, fetched 2026-10-06) and the 401/404 behaviour was probed on the wire the same day.
 * The GitHub README the catalogue links (`Simplero/Simplero-API`) documents the DEPRECATED v1
 * API; nothing here comes from it.
 *
 * ## Facts that cost a day if you miss them
 *
 *  - **One fixed host.** `https://simplero.com`, paths under `/api/v2/`. There is no per-account
 *    subdomain for the API, so `network.allow` is the single literal `simplero.com`.
 *  - **A `User-Agent` is required.** The spec's description says to send the app name and a
 *    contact in it (`MyApp (me@example.com)`). It is set here, on every request, rather than
 *    left to whatever the host's `ctx.fetch` defaults to.
 *  - **Contacts are `customers` in the path.** `/api/v2/customers` is what the UI calls
 *    "contacts" (the operation summaries say "List contacts").
 *  - **Two error envelopes.** A bad key is `401 {"error":"Bad API key"}` (singular `error`, a
 *    string); a validation failure is `422 {"errors":["…"]}` (plural, an array). An unknown path
 *    is `404 text/html` — a 195 KB Simplero web page, NOT JSON — so `errorMessage` must not
 *    assume a JSON body.
 *  - **Action endpoints can answer 200 with `success:false`.** `POST /customers/{id}/actions/*`
 *    returns `{"data":{"success":bool,"message":string}}`; `callAction` reads `success` rather
 *    than trusting the status line.
 *
 * The credential is never touched here: `auth/api-key.ts`'s `sign` hook stamps `X-API-Key`.
 */

/** The one host this app talks to. Mirrored by `w6w.network.allow`. */
export const API_HOST = "simplero.com";

/** Origin every request path hangs off. */
export const API_ORIGIN = `https://${API_HOST}`;

/** Prefix of every v2 path. */
export const API_PREFIX = "/api/v2";

/**
 * Sent on every request — Simplero's spec asks for the app name plus a contact in the
 * `User-Agent`. The contact part is a plain description rather than a mailbox or URL this repo
 * cannot vouch for (the pack audit also reads any domain in source as an undeclared host).
 */
export const USER_AGENT = "w6w-simplero/0.1.0 (w6w integration platform)";

export type QueryValue = string | number | boolean | undefined | null | QueryObject;
export interface QueryObject {
  [key: string]: QueryValue;
}

/**
 * Flatten a query object into URL search params. Simplero documents its filters as
 * `style: deepObject`, so a nested object `{ email: { op: "equals", value: "a@b.c" } }` becomes
 * `email[op]=equals&email[value]=a%40b.c` — the brackets are part of the key.
 * Empty strings, `null` and `undefined` are dropped.
 */
export function buildQuery(query: QueryObject = {}): URLSearchParams {
  const out = new URLSearchParams();
  const walk = (prefix: string, value: QueryValue) => {
    if (value === undefined || value === null || value === "") return;
    if (typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(`${prefix}[${k}]`, v);
      return;
    }
    out.append(prefix, String(value));
  };
  for (const [k, v] of Object.entries(query)) walk(k, v);
  return out;
}

export function truncate(text: string, max = 300): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes)`;
}

/**
 * Turn a failed response into an actionable message. Reads `error` (string, the 401 shape) and
 * `errors` (array, the 422 shape); a non-JSON body — the HTML 404 page — is summarised by its
 * content type and size instead of being pasted.
 */
export function errorMessage(
  status: number,
  method: string,
  path: string,
  contentType: string,
  raw: string,
): string {
  const head = `Simplero ${status} for ${method} ${path}`;
  let parsed: { error?: unknown; errors?: unknown } | null = null;
  try {
    parsed = JSON.parse(raw) as { error?: unknown; errors?: unknown };
  } catch { /* not JSON */ }

  if (parsed && typeof parsed === "object") {
    const detail = typeof parsed.error === "string"
      ? parsed.error
      : Array.isArray(parsed.errors)
      ? parsed.errors.map(String).join("; ")
      : undefined;
    if (detail) return `${head}: ${truncate(detail, 600)}`;
    return `${head}: ${truncate(raw, 600)}`;
  }
  if (/html/i.test(contentType)) {
    return `${head}: the response was an HTML page (${raw.length} bytes), not an API answer — ` +
      "the path is not an API v2 route";
  }
  return raw ? `${head}: ${truncate(raw, 600)}` : head;
}

export interface Pagination {
  page: number | null;
  per_page: number;
  total: number | null;
  total_pages: number | null;
  next_after: number | null;
}

export interface ListResult {
  items: unknown[];
  page: number | null;
  perPage: number | null;
  total: number | null;
  totalPages: number | null;
  nextAfter: number | null;
  hasMore: boolean;
}

export class SimpleroClient {
  constructor(private ctx: HookContext) {}

  async get<T = unknown>(path: string, query?: QueryObject): Promise<T> {
    return await this.send<T>("GET", path, { query });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return await this.send<T>("POST", path, { body: body ?? {} });
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return await this.send<T>("PATCH", path, { body: body ?? {} });
  }

  /** `GET` a collection and fold Simplero's `{ data, pagination }` envelope. */
  async list(path: string, query?: QueryObject): Promise<ListResult> {
    const body = await this.get<{ data?: unknown; pagination?: Partial<Pagination> }>(path, query);
    if (!body || !Array.isArray(body.data)) {
      throw new Error(`Simplero GET ${path}: response had no \`data\` array`);
    }
    const p = body.pagination ?? {};
    const items = body.data;
    const perPage = p.per_page ?? null;
    // `total_pages`/`page` are null under cursor (`after`) paging; fall back to "a full page
    // means there may be more".
    const hasMore = p.total_pages != null && p.page != null
      ? p.page < p.total_pages
      : perPage != null && items.length >= perPage && p.next_after != null;
    return {
      items,
      page: p.page ?? null,
      perPage,
      total: p.total ?? null,
      totalPages: p.total_pages ?? null,
      nextAfter: p.next_after ?? null,
      hasMore,
    };
  }

  /** `GET` one record and unwrap `{ data }`. */
  async one(path: string): Promise<unknown> {
    const body = await this.get<{ data?: unknown }>(path);
    if (!body || body.data === undefined || body.data === null) {
      throw new Error(`Simplero GET ${path}: response had no \`data\` record`);
    }
    return body.data;
  }

  /** `POST`/`PATCH` a record write and unwrap `{ data }`. */
  async write(method: "POST" | "PATCH", path: string, payload: unknown): Promise<unknown> {
    const body = await this.send<{ data?: unknown }>(method, path, { body: payload });
    if (!body || body.data === undefined || body.data === null) {
      throw new Error(`Simplero ${method} ${path}: response had no \`data\` record`);
    }
    return body.data;
  }

  /**
   * `POST /customers/{id}/actions/<name>`. The answer is `{ data: { success, message } }`; a
   * `success: false` is a failure even on HTTP 200.
   */
  async callAction(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string | null }> {
    const body = await this.send<{ data?: { success?: boolean; message?: string } }>("POST", path, {
      body: payload,
    });
    const data = body?.data;
    if (!data || typeof data.success !== "boolean") {
      throw new Error(`Simplero POST ${path}: response carried no \`data.success\` flag`);
    }
    if (!data.success) {
      throw new Error(`Simplero POST ${path}: ${data.message ?? "the action reported failure"}`);
    }
    return { success: true, message: data.message ?? null };
  }

  private async send<T>(
    method: string,
    path: string,
    options: { query?: QueryObject; body?: unknown },
  ): Promise<T> {
    const url = new URL(`${API_ORIGIN}${API_PREFIX}${path}`);
    for (const [k, v] of buildQuery(options.query)) url.searchParams.append(k, v);

    const headers: Record<string, string> = {
      accept: "application/json",
      "user-agent": USER_AGENT,
    };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok) throw new Error(errorMessage(res.status, method, url.pathname, contentType, text));

    // HTTP 200 is not proof of an API answer: a vendor SPA/HTML shell is also a 200.
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Simplero ${method} ${url.pathname}: expected JSON but got ${
          contentType || "no content type"
        } (${text.length} bytes)`,
      );
    }
  }
}
