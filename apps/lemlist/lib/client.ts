import type { HookContext } from "@w6w/types";

/**
 * lemlist API.
 *
 * ## Base URL
 *
 * `https://api.lemlist.com/api`, stated verbatim on lemlist's own overview page
 * ("All API routes live at `https://api.lemlist.com/api`") and repeated inside
 * the OpenAPI `info.description` shipped with every endpoint page: "All API
 * routes use the dedicated subdomain `api.lemlist.com`." Verified 2026-08-03.
 *
 * That one host is the whole egress allowlist. The vendor status page lives on a
 * DIFFERENT host (`status.lempire.com`) and is deliberately NOT allowlisted here
 * — `health/service.ts` widens egress for its own unsigned hook only.
 *
 * ## Versioning is TWO different mechanisms, and conflating them breaks calls
 *
 * lemlist has no `/v1` prefix and no version header. Instead:
 *
 *  1. **A `version=v2` QUERY PARAMETER** on a handful of otherwise-v1 paths,
 *     which switches the *response shape*. On `GET /activities` the OpenAPI
 *     document marks it `required: true` ("API version. v2 is mandatory"), and
 *     `GET /leads/{email}` carries a documentation Warning in as many words:
 *     "You must set the mandatory query parameter *version* to `version=v2`."
 *     On `GET /campaigns` and `GET /team` it is optional but schema-defaulted to
 *     `v2`, and on `/team` it is what adds the `users` array of team members.
 *
 *  2. **A `/v2/` PATH PREFIX** on a small, separate set of genuinely newer
 *     resources — `/v2/unsubscribes/...`, `/v2/campaigns/{id}/stats`,
 *     `/v2/campaigns/stats/batch`, `/v2/enrichments/bulk`. These are not the
 *     same endpoints with a flag; they are different routes that replace legacy
 *     ones (see `actions/list-unsubscribes.ts` for the deprecation trail).
 *
 * Both live under the same `https://api.lemlist.com/api` base. This app sends
 * `version=v2` wherever lemlist documents it, and uses the `/v2/` paths for
 * unsubscribes because the unprefixed ones are marked `deprecated: true`.
 *
 * ## Rate limits
 *
 * 20 requests per 2 seconds, per API key, applied on all routes (lemlist's
 * OpenAPI `info.description`). The response carries `Retry-After`,
 * `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`;
 * `health/quota.ts` reads them.
 */
export const API_URL = "https://api.lemlist.com/api";

/**
 * Query params shared by lemlist's offset-paginated list endpoints.
 *
 * lemlist is offset/limit, not cursor-based, and its own `/activities` docs spell
 * out the consequence: "This is not traditional cursor-based pagination. To
 * retrieve all activities, increment offset by the limit value on each request
 * (e.g., offset=0, then offset=100, then offset=200, etc.)."
 */
export interface PageInput {
  offset?: number;
  limit?: number;
}

/** Map the shared page inputs onto lemlist's query names (which are already these). */
export function pageQuery(input: PageInput): Record<string, number | undefined> {
  return { offset: input.offset, limit: input.limit };
}

/**
 * The `Param[]` fragment every offset-paginated list action reuses.
 *
 * `limit`'s ceiling differs per endpoint (100 for campaigns/activities/
 * unsubscribes, 500 for campaign leads), so the per-action hint overrides this
 * one where it matters rather than stating a single wrong maximum here.
 */
export const PAGE_PARAMS = [
  {
    key: "limit",
    label: "Limit",
    type: "number" as const,
    hint: "Results per page. lemlist defaults to 100; the maximum varies per endpoint.",
  },
  {
    key: "offset",
    label: "Offset",
    type: "number" as const,
    hint: "Records to skip. lemlist has no cursors — walk a collection by incrementing this by " +
      "`limit` on each request (0, 100, 200, …).",
  },
];

/**
 * The `Param[]` fragment the two endpoints that also accept page/sort reuse
 * (`GET /campaigns` and `GET /schedules`).
 */
export const SORT_PARAMS = [
  {
    key: "page",
    label: "Page",
    type: "number" as const,
    hint: "1-based page number. An alternative to `offset`; lemlist uses `offset` if unset.",
  },
  {
    key: "sortBy",
    label: "Sort by",
    type: "select" as const,
    options: [{ value: "createdAt", label: "Created at" }],
    hint: "lemlist currently supports only `createdAt`.",
  },
  {
    key: "sortOrder",
    label: "Sort order",
    type: "select" as const,
    options: [
      { value: "asc", label: "Ascending" },
      { value: "desc", label: "Descending" },
    ],
    hint: "`desc` sorts descending; anything else (or omission) sorts ascending.",
  },
];

/** Inputs matching `SORT_PARAMS`. */
export interface SortInput {
  page?: number;
  sortBy?: "createdAt";
  sortOrder?: "asc" | "desc";
}

/** Map the shared sort inputs onto lemlist's query names. */
export function sortQuery(input: SortInput): Record<string, string | number | undefined> {
  return { page: input.page, sortBy: input.sortBy, sortOrder: input.sortOrder };
}

/**
 * lemlist's campaign/lead status vocabulary, taken from the `status` enum on
 * `GET /campaigns` and reused by `GET /team/senders`'s `state` filter.
 */
export const CAMPAIGN_STATUS_OPTIONS = [
  { value: "running", label: "Running" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "ended", label: "Ended" },
  { value: "archived", label: "Archived" },
  { value: "errors", label: "Errors" },
];

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * Note what is deliberately absent: this class never builds an `Authorization`
 * header. The runtime routes every request through the auth `sign` hook, which
 * is the only code handed the raw credential. An action that set the header
 * itself would both leak the credential into the network-capable worker and
 * fail the pack auditor.
 */
export class LemlistClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* body already consumed or unreadable — the status still tells the story */ }
      throw new Error(
        `lemlist ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    // Several lemlist routes answer a write with a bare string ("Variable
    // subscribed") rather than JSON. Returning the raw text beats throwing.
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }
}

/**
 * Drop keys whose value is `undefined` so a create/update never sends a literal
 * `undefined` for a field the caller simply did not mention. `null` survives on
 * purpose — it is a meaningful "clear this".
 */
export function compact<T extends Record<string, unknown>>(body: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Merge caller-supplied custom variables into a lead body.
 *
 * lemlist stores **any extra top-level key** on a lead as a custom variable
 * usable in a campaign as `{{yourVariableName}}` — its create-lead page says so
 * explicitly, and the OpenAPI request schema carries `additionalProperties:
 * { type: string }` to match. So custom variables are flattened onto the body,
 * not nested under a wrapper key.
 *
 * lemlist's own naming rule, reproduced from that page: "only letters, digits,
 * `_`, `-`, space and `#` are kept — any other character (e.g. `.` or `$`) is
 * replaced by `_`". We do NOT sanitise here: lemlist applies that server-side,
 * and silently rewriting a caller's key would hide which variable they got.
 */
export function withCustomVariables(
  body: Record<string, unknown>,
  custom?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!custom) return body;
  return { ...body, ...custom };
}
