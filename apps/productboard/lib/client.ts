import type { HookContext } from "@w6w/types";

/**
 * Productboard REST API **v2** client.
 *
 * Everything in this module was verified on 2026-08-11 against Productboard's
 * own machine-readable OpenAPI documents — the nine files listed at
 * `developer.productboard.com/v2/openapi` (`entities.yaml` 135,370 B,
 * `notes.yaml` 91,906 B, `plugin-integrations.yaml` 52,553 B, `teams.yaml`
 * 38,989 B, `members.yaml` 28,311 B, `webhooks.yaml` 26,797 B,
 * `jira-integrations.yaml` 22,313 B, `analytics.yaml` 15,549 B,
 * `customer-scores.yaml` 13,102 B; every one `openapi: 3.1.1`,
 * `info.version: 2.0.0`, single server `https://api.productboard.com/v2`) —
 * plus live probes against `api.productboard.com` and
 * `status.productboard.com` on the same day. Nothing came from a third-party
 * integration directory.
 *
 * ## v2, and therefore **no `X-Version` header**
 *
 * Productboard runs two API generations side by side on the same host:
 *
 *  - **v1** — unprefixed paths (`GET /features`), and it requires
 *    `X-Version: 1` on every request. Its own OpenAPI document
 *    (`/v1.0.0/openapi/publicswagger.yaml`, 286,943 B) declares that header as
 *    `required: true` with `enum: [1]` — one legal value, so there is no
 *    "current" value to raise.
 *  - **v2** — `/v2`-prefixed paths, and **no version header at all**. The
 *    vendor's migration guide says so in as many words, under the heading
 *    "No X-Version header required": *"v1 required an `X-Version` header on
 *    every request. In v2, you just call the endpoint directly — no version
 *    header needed."* Not one of the nine v2 OpenAPI documents mentions
 *    `X-Version` (measured: 0 occurrences across all nine).
 *
 * **All 119 v1 operations are marked `deprecated: true` in v1's own OpenAPI
 * document; none of v2's 59 are.** That is the version question answered the
 * sharp way — it is v2's pages that lack the deprecation mark — and it is why
 * this app is built entirely on v2 and never sends `X-Version`.
 *
 * ## Two error shapes, not one, and the documented one is the rarer
 *
 * The v2 documents define exactly one error body,
 * `{"id": "...", "errors": [{"code", "title", "detail"}]}`, and use it for
 * every status from 400 to 500. **The gateway in front of the API does not use
 * it.** Measured live, every authentication failure answers a Kong-shaped
 * `{"message": "..."}` instead:
 *
 *   | Request                              | Status | Body                                          |
 *   | ------------------------------------ | ------ | --------------------------------------------- |
 *   | no `Authorization` header            | 401    | `{"message":"Unauthorized"}`                  |
 *   | `Authorization: Bearer ` (empty)     | 401    | `{"message":"Unauthorized"}`                  |
 *   | a non-JWT token, or a non-Bearer     | 401    | `{"message":"Bad token; invalid JSON"}`       |
 *   |   scheme                             |        |                                               |
 *   | a well-formed JWT, unknown issuer    | 401    | `{"message":"No credentials found for given 'iss'"}` |
 *   | `/v2/<path that does not exist>`     | 404    | `{"errors":[{"code":"route.notFound",…}],"id":…}` |
 *
 * Four distinct causes, **one status code**, and two incompatible body shapes.
 * A client that parses only the documented `errors[]` shape gets nothing at all
 * from the single most common failure it will ever see, so
 * {@link formatProductboardError} reads both.
 *
 * ## `HEAD` is not routed
 *
 * `GET https://api.productboard.com/v2/entities` answers **401**;
 * `HEAD` on the identical URL answers **404** with the `route.notFound` body.
 * A reachability probe written with `HEAD` — the obvious choice, since the body
 * is not wanted — therefore reports a perfectly healthy API as a dead route.
 * Every request this app makes, health probes included, is a real `GET`.
 *
 * ## Pagination is cursor-only
 *
 * v2 has no page/offset anywhere. A list answers
 * `{"data": [...], "links": {"next": "<absolute URL>" | null}}`, and the cursor
 * is a `pageCursor` query parameter *inside* that URL. The vendor's guidance is
 * to treat it as opaque and to stop when `links.next` is absent, which is what
 * {@link extractPageCursor} implements: it lifts the parameter out of the URL so
 * a workflow can feed it straight back into the next step, without the next step
 * having to be handed a whole absolute URL it would then have to trust.
 */

/** The one server declared by all nine v2 OpenAPI documents. */
export const API_BASE = "https://api.productboard.com";

/** Every v2 path carries this prefix. v1's unprefixed paths are all deprecated. */
export const API_PREFIX = "/v2";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** The v2 list envelope. `links.next` is `null`, not absent, on the last page. */
export interface ProductboardListPage<T> {
  data?: T[];
  links?: { next?: string | null };
}

/** The v2 single-resource envelope. */
export interface ProductboardItem<T> {
  data?: T;
}

/**
 * The three result shapes every Action in this app returns.
 *
 * Declared as types rather than left implicit so each Action's `output` field
 * list has something to be checked against, and so a test asserting on a result
 * is asserting against a shape the compiler agrees with.
 */
export interface ListResult<T = unknown> {
  items: T[];
  nextPageCursor?: string;
  hasMore: boolean;
}

export interface DataResult<T = unknown> {
  data: T;
}

export interface DeleteResult {
  status: number;
  deleted: boolean;
}

/** The error body the v2 documents define — and the gateway never sends. */
interface DocumentedErrorBody {
  id?: string;
  errors?: Array<{ code?: string; title?: string; detail?: string }>;
}

/** The error body the gateway actually sends on every auth failure. */
interface GatewayErrorBody {
  message?: string;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `archived=false` and `processed=false` are both
 * meaningful filters — Productboard's list endpoints return archived *and*
 * unarchived notes when the parameter is absent — so dropping a `false` would
 * make "only the live ones" impossible to express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Normalise a `multiselect` param into a list of query values.
 *
 * The array query parameters in this API (`type[]`, `fields[]`, `roles[]`,
 * `state[]`) declare no `style`/`explode`, so OpenAPI's defaults apply —
 * `style: form`, `explode: true` — which means one repeated key per value
 * (`type[]=feature&type[]=product`), not one comma-joined value. Two of them
 * state it explicitly (`members.yaml`, `notes.yaml` carry
 * `"style":"form","explode":true`); the rest inherit it.
 */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
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

/** Keep an error message readable — a validation body can list many errors. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Path-escape a caller-supplied identifier.
 *
 * Every v2 path parameter but two is a `format: uuid`, and the exceptions
 * (`/entities/configurations/{type}`, `/entities/fields/{id}/values`) are an
 * enum and a field id. None of them may contain a `/` or a `?`, so escaping is
 * pure defence against a pasted URL turning one request into another.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Lift the opaque `pageCursor` out of an absolute `links.next` URL.
 *
 * Returning the cursor rather than the URL is deliberate. The next step in a
 * workflow feeds it back as an ordinary parameter, and the request it produces
 * is still built from {@link API_BASE} here — so a `links.next` that ever
 * pointed somewhere else could not redirect this app off its allowlisted host.
 */
export function extractPageCursor(next: string | null | undefined): string | undefined {
  if (!next) return undefined;
  try {
    return new URL(next).searchParams.get("pageCursor") ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Classify a Productboard failure body into one actionable line.
 *
 * Reads **both** documented and gateway shapes (see the module header). The
 * `code` from the documented shape is kept verbatim because it is the stable,
 * machine-readable half of the vendor's own taxonomy — `auth.accessDenied`
 * (the token is fine but lacks the scope or the workspace permission),
 * `resource.notFound` (the id is wrong), `route.notFound` (the *path* is wrong)
 * and `rate.limitExceeded` are four different problems with four different
 * fixes, and all four otherwise arrive as a bare status.
 *
 * The message can carry only Productboard's own prose and the caller's own
 * input; the credential never enters this module.
 */
export function formatProductboardError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: (DocumentedErrorBody & GatewayErrorBody) | null = null;
  try {
    parsed = JSON.parse(raw) as DocumentedErrorBody & GatewayErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const parts: string[] = [];
  const documented = parsed?.errors?.filter(Boolean) ?? [];
  if (documented.length > 0) {
    const codes = documented.map((e) => e.code ?? "error").join(", ");
    parts.push(`Productboard ${status} ${codes} for ${method} ${path}`);
    for (const e of documented) {
      const line = [e.title, e.detail].filter(Boolean).join(": ");
      if (line) parts.push(line);
    }
    if (parsed?.id) parts.push(`request id ${parsed.id}`);
  } else if (parsed?.message) {
    parts.push(`Productboard ${status} for ${method} ${path}: ${parsed.message}`);
  } else {
    parts.push(`Productboard ${status} for ${method} ${path}: ${truncate(raw)}`);
  }

  if (status === 429) {
    parts.push(
      "Productboard allows 50 requests/second per access token; back off and retry, honouring " +
        "the Retry-After header",
    );
  }
  return truncate(parts.join(" · "), 1200);
}

export class ProductboardClient {
  constructor(private ctx: HookContext) {}

  /** `{"data": …}` in, `data` out — the shape of every v2 endpoint that returns a body. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<ProductboardItem<T>>(path, options);
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }

  /**
   * A list page, with the next cursor already lifted out of `links.next`.
   *
   * `hasMore` is derived from the presence of a cursor rather than from the
   * item count: a full page is not evidence of another one, and an empty page
   * with a cursor does happen when a filter excludes everything in a window.
   */
  async list<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<ListResult<T>> {
    const body = await this.json<ProductboardListPage<T>>(path, options);
    const nextPageCursor = extractPageCursor(body?.links?.next);
    return {
      items: Array.isArray(body?.data) ? body.data : [],
      nextPageCursor,
      hasMore: nextPageCursor !== undefined,
    };
  }

  /** Parse the body without unwrapping. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for the deletes — every one of which answers 204 with no body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Repeated key per value, not a comma-joined one — see `toList`.
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    // No X-Version: v2 takes no version header. See the module header.
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatProductboardError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
