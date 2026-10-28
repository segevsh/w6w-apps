import type { HookContext } from "@w6w/types";

/**
 * LinkedIn Marketing (Ads) API — the versioned `/rest/` surface under
 * `api.linkedin.com`, covering Ad Accounts, Campaign Groups, Campaigns,
 * Creatives, Ad Analytics and Matched Audiences (DMP Segments).
 *
 * This is a **separate product surface** from the member/social `linkedin`
 * app in this pack: same host and the same Rest.li transport conventions
 * (`X-Restli-Protocol-Version: 2.0.0`, versioned via `Linkedin-Version`), but
 * a distinct API family gated behind LinkedIn's **Advertising API program**
 * (see `auth/oauth2.ts`), not the free consumer "Sign In with LinkedIn" /
 * "Share on LinkedIn" products.
 *
 * Everything below was verified on 2026-08-15 against Microsoft
 * Learn's LinkedIn Marketing docs (`learn.microsoft.com/en-us/linkedin/marketing/`,
 * versioned view `li-lms-2026-07`) and live, unauthenticated probes against
 * `api.linkedin.com`.
 *
 * ## The version header, and why 202607
 *
 * Every `/rest/` call MUST carry `Linkedin-Version: YYYYMM`. LinkedIn publishes
 * a new version monthly and supports each for a **minimum of one year** before
 * sunsetting it on a rolling schedule — the versioning doc itself carries a
 * live banner: "The Marketing Version 202507 (Marketing July 2025) has been
 * sunset." A stale header eventually 400s/426s rather than quietly serving
 * an old shape, so **the pinned version below needs a periodic bump** — check
 * https://learn.microsoft.com/en-us/linkedin/marketing/versioning for the
 * current "Latest Version" before it goes stale.
 *
 * `202607` (July 2026) was that page's documented latest version on
 * 2026-08-15, and is also the version the sibling `linkedin` app already
 * pins for its own versioned calls.
 *
 * ## Rest.li, not ordinary REST
 *
 * The query grammar is Rest.li 2.0.0, not plain query strings:
 *   - `q=search` / `q=account` selects a **finder** method; `X-RestLi-Method`
 *     selects a **write** kind the HTTP verb alone can't disambiguate
 *     (`PARTIAL_UPDATE`, `BATCH_CREATE`, `BATCH_PARTIAL_UPDATE`, `FINDER`).
 *   - List-valued params are `List(a,b,c)`, and a "search by field" criterion
 *     is `field:(values:List(v1,v2))` — see {@link restliList} and
 *     {@link buildSearch}.
 *   - Almost every id in this API is a URN (`urn:li:sponsoredAccount:123`),
 *     built here rather than accepted raw from a param — see
 *     {@link sponsoredAccountUrn} and friends.
 *
 * ## Single-create vs batch-create is inconsistent, and it matters
 *
 * Ad Accounts and Campaigns both document a **plain single create**
 * (`POST .../adCampaigns` with a bare object body, default `CREATE` method) —
 * easy to miss, because the docs' own table of contents lists "Create
 * Campaigns" right next to "Batch Create Campaigns" and the batch form is
 * what's shown first. **Campaign Groups do not**: only `POST .../adCampaignGroups`
 * with a bare body (single, confirmed) for CREATE, but **update** is
 * batch-only — there is no documented plain `PARTIAL_UPDATE` for a single
 * Campaign Group, only `BATCH_PARTIAL_UPDATE` with `ids=List(id)` and an
 * `entities` map, even when updating one. `campaign-group-update.ts` sends
 * that batch-of-one shape.
 *
 * ## Two response shapes for "give me a page of results"
 *
 * Ad Accounts, Campaign Groups, Campaigns and Creatives searches are
 * **cursor-paginated** (`pageSize`/`pageToken` in, `metadata.nextPageToken`
 * out — moved off index pagination from version 202401). DMP Segment lookup
 * and Ad Analytics are **not**: they answer the older `paging.start/count`
 * shape (Analytics) or `paging.start/count/total` (DMP Segments), and
 * `adAnalytics` documents no pagination support at all. This client exposes
 * both verbatim rather than normalising them, because guessing the wrong one
 * silently drops results past the first page.
 *
 * ## Create returns no body — the id is in a header
 *
 * A successful `POST` that creates something (`adAccounts`, `adCampaignGroups`,
 * `adCampaigns`, `creatives`, `dmpSegments`) answers `201` with the new
 * entity's id in the `x-restli-id` response header, not the body — mirroring
 * the member `linkedin` app's Posts API. `request()` surfaces that as `{ id }`
 * when the body is empty.
 */

/** The one and only API origin for the versioned Rest.li surface. */
export const API_URL = "https://api.linkedin.com";

/**
 * Pinned per the versioning policy above. Bump when Microsoft Learn's
 * versioning page names a newer "Latest Version" — check before shipping.
 */
export const API_VERSION = "202607";

export interface LinkedInAdsErrorBody {
  status?: number;
  /** Numeric internal error code, e.g. `65600`. Present on most 4xx bodies. */
  serviceErrorCode?: number;
  /** Stable machine code, e.g. `INVALID_ACCESS_TOKEN`, `EMPTY_ACCESS_TOKEN`. */
  code?: string;
  message?: string;
}

export interface RequestOptions {
  method?: string;
  /**
   * Query parameters, pre-built by the caller (see {@link restliList},
   * {@link buildSearch}, {@link buildDateRange}) into their final Rest.li
   * wire form. Appended verbatim rather than run through `URLSearchParams`,
   * which would percent-encode the `(`, `)` and `,` the grammar depends on.
   */
  query?: Record<string, string | undefined>;
  body?: unknown;
  /**
   * Sets `X-RestLi-Method`. Required whenever the HTTP verb alone doesn't say
   * which Rest.li operation this is: `FINDER` (a `q=` query other than the
   * default resource-collection GET), `PARTIAL_UPDATE`, `BATCH_CREATE`,
   * `BATCH_PARTIAL_UPDATE`, or (per LinkedIn's own delete-by-POST examples)
   * a plain `DELETE` sent as a fallback for hosts that block the verb.
   */
  restliMethod?: string;
}

/**
 * Thin wrapper over `ctx.fetch` for the versioned `/rest/` API. Every call
 * carries the two headers LinkedIn requires (`X-Restli-Protocol-Version`,
 * `Linkedin-Version`); `Authorization` is injected by the auth `sign` hook,
 * never here.
 */
export class LinkedInAdsClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const qs = Object.entries(options.query ?? {})
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    const url = `${API_URL}${path}${qs ? `?${qs}` : ""}`;

    const headers: Record<string, string> = {
      accept: "application/json",
      "x-restli-protocol-version": "2.0.0",
      "linkedin-version": API_VERSION,
    };
    if (options.restliMethod) headers["x-restli-method"] = options.restliMethod;

    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, init);
    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      throw new Error(formatLinkedInAdsError(res.status, init.method ?? "GET", path, raw));
    }

    if (res.status === 204) return undefined as T;

    const restliId = res.headers.get("x-restli-id");
    const text = await res.text();
    if (!text) return (restliId ? { id: restliId } : undefined) as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Turn LinkedIn's error body into one actionable line. `code` is kept
 * verbatim because it's the stable, documented signal — `EMPTY_ACCESS_TOKEN`
 * (no credential reached the request), `INVALID_ACCESS_TOKEN` (wrong,
 * expired or revoked) and an insufficient-permission 403 are three different
 * problems, and a flattened "HTTP 401" hides which one you hit. The message
 * can carry only LinkedIn's own prose and the caller's own input.
 */
export function formatLinkedInAdsError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: LinkedInAdsErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as LinkedInAdsErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message && !parsed?.code) {
    return `LinkedIn ${status} for ${method} ${path}: ${truncate(raw || "(empty body)")}`;
  }
  const parts = [
    `LinkedIn ${status}${parsed.code ? ` ${parsed.code}` : ""} for ${method} ${path}`,
    parsed.message,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

// --------------------------------------------------------------- URNs -----

/** Accepts a bare id or an already-formed URN and returns the URN. */
function toUrn(kind: string, id: string | number): string {
  const s = String(id);
  return s.startsWith("urn:li:") ? s : `urn:li:${kind}:${s}`;
}

export const sponsoredAccountUrn = (id: string | number): string => toUrn("sponsoredAccount", id);
export const sponsoredCampaignGroupUrn = (id: string | number): string =>
  toUrn("sponsoredCampaignGroup", id);
export const sponsoredCampaignUrn = (id: string | number): string => toUrn("sponsoredCampaign", id);
export const sponsoredCreativeUrn = (id: string | number): string => toUrn("sponsoredCreative", id);
export const organizationUrn = (id: string | number): string => toUrn("organization", id);

/**
 * Strip a `urn:li:sponsoredAccount:` (or any) prefix down to the bare
 * numeric id, for building a path segment. LinkedIn's account-scoped paths
 * (`/adAccounts/{id}/adCampaigns`) take the bare numeric id, never the URN.
 */
export function bareId(idOrUrn: string | number): string {
  const s = String(idOrUrn);
  const i = s.lastIndexOf(":");
  return i === -1 ? s : s.slice(i + 1);
}

/**
 * URL-encode a URN (or any dynamic value) for embedding inside a Rest.li
 * `List(...)` or as a path segment — LinkedIn's own examples do this for
 * URN-valued list members (`campaigns=List(urn%3Ali%3AsponsoredCampaign%3A1)`)
 * and for a creative id used as a path segment.
 */
export const encodeUrn = (value: string | number): string => encodeURIComponent(String(value));

// ------------------------------------------------------- Rest.li query ----

/** `List(a,b,c)`, each member percent-encoded (safe for URNs and plain enums alike). */
export function restliList(values: ReadonlyArray<string | number>): string {
  return `List(${values.map(encodeUrn).join(",")})`;
}

export interface SearchCriterion {
  field: string;
  /** ORed together inside this field. Omitted/empty criteria are dropped. */
  values?: ReadonlyArray<string | number>;
  /**
   * A scalar (non-list) criterion, e.g. LinkedIn's `test:true` boolean flag,
   * which the vendor documents as taking a bare `true`/`false` rather than a
   * `(values:List(...))` document.
   */
  scalar?: string;
}

/**
 * Build a Rest.li `search=(...)` value from a list of criteria, ANDed
 * together with each field's own values ORed — exactly the grammar every
 * `q=search` finder in this API documents. Returns `""` when nothing was
 * supplied, so a caller can safely omit `search` when the caller passed no
 * filters (the vendor still requires *some* search parameter for a few
 * endpoints — those actions supply their own `q`-only fallback).
 */
export function buildSearch(criteria: ReadonlyArray<SearchCriterion>): string {
  const parts = criteria
    .filter((c) => c.scalar !== undefined || (c.values && c.values.length > 0))
    .map((c) =>
      c.scalar !== undefined
        ? `${c.field}:${c.scalar}`
        : `${c.field}:(values:${restliList(c.values!)})`
    );
  return parts.length > 0 ? `(${parts.join(",")})` : "";
}

/** `true`/`false` scalar helper for the `search.test` tri-state filters. */
export function triState(v: unknown): string | undefined {
  if (v === true || v === "true") return "true";
  if (v === false || v === "false") return "false";
  return undefined;
}

export interface AdsDate {
  year: number;
  month: number;
  day: number;
}

/** Parse the `YYYY-MM-DD` a `type: "date"` Param hands back. */
export function parseAdsDate(iso: string | undefined): AdsDate | undefined {
  if (!iso) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) throw new Error(`Not a YYYY-MM-DD date: ${iso}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/**
 * `dateRange=(start:(year:Y,month:M,day:D)[,end:(...)])`. `end` is exclusive
 * of nothing special server-side but is documented as strictly-after `start`
 * when present; omitting it means "start to everything after".
 */
export function buildDateRange(start: AdsDate, end?: AdsDate): string {
  const fmt = (d: AdsDate) => `(year:${d.year},month:${d.month},day:${d.day})`;
  return `(start:${fmt(start)}${end ? `,end:${fmt(end)}` : ""})`;
}

/**
 * Epoch milliseconds from the `YYYY-MM-DD` a `type: "date"` Param hands
 * back — `runSchedule.start`/`.end` on Campaign Groups and Campaigns are
 * both documented as `long` epoch-ms timestamps (the vendor's own examples:
 * `1234567890987`), not the day-granular `{year,month,day}` struct
 * `dateRange` uses on the reporting endpoints.
 */
export function epochMsFromDate(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const ms = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(ms)) throw new Error(`Not a valid date: ${iso}`);
  return ms;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed
 * — the host hands a `json` param through in whichever shape it arrived.
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

/** Drop keys the caller left unset, for a plain JSON request body. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
