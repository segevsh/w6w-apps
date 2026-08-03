import type { HookContext, Param } from "@w6w/types";

/**
 * The Wix REST base. Every Wix product API — CMS (`/wix-data`), Contacts
 * (`/contacts`), Stores (`/stores`), eCommerce (`/ecom`), Site Properties
 * (`/site-properties`), Sites (`/site-list`) — is a path prefix under this one
 * host, so a single allowlist entry covers the whole app.
 *
 * Verified live 2026-08-03: every path this app calls was confirmed against the
 * running service, not just the docs. An unauthenticated request to a real Wix
 * route answers with a JSON body and an `x-wix-responded-by` header naming the
 * exact handler (e.g. `wix.data.v2.data_item:QueryDataItems`), whereas an
 * invented sibling path answers 404 with no such header. Each action file
 * records the handler name its path resolved to.
 */
export const API_URL = "https://www.wixapis.com";

/**
 * Which identity a call is scoped to.
 *
 * Wix splits its REST surface in two. Most APIs are **site-level** and want a
 * `wix-site-id` header; a few (Sites, Accounts, Domains) are **account-level**
 * and want `wix-account-id`. Wix's own documentation is explicit that a call
 * carries "either the `wix-account-id` header or the `wix-site-id` header, but
 * not both", so the app has to know which one a given path needs.
 */
export type WixScope = "site" | "account";

/**
 * Internal marker header, and the reason it exists.
 *
 * The identity header's *value* comes from the Connection, and only the auth
 * `sign` hook may read a Connection. But *which* header to send is a property
 * of the endpoint, which only the action knows. Neither half can decide alone.
 *
 * So the client stamps this marker with the scope, `sign` reads it, substitutes
 * the real `wix-site-id` / `wix-account-id` header from the credential, and
 * **deletes the marker**. It never reaches Wix. The alternative — having `sign`
 * pattern-match on the request URL — would silently send the wrong header the
 * first time Wix adds a path prefix, which is exactly the kind of failure that
 * is hard to see in a workflow log.
 */
export const SCOPE_HEADER = "x-w6w-wix-scope";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Defaults to `"site"` — all but two of this app's endpoints are site-level. */
  scope?: WixScope;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * It never sets `Authorization` and never reads a credential: the runtime routes
 * every request through the auth `sign` hook, which is the only code handed the
 * API key. All this class contributes is the base URL, query encoding, the scope
 * marker, and a uniform error.
 */
export class WixClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      [SCOPE_HEADER]: options.scope ?? "site",
    };
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
      } catch { /* ignore */ }
      throw new Error(
        `Wix ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

// ------------------------------------------------------------------ paging --

/**
 * Wix uses two paging idioms and they are not interchangeable.
 *
 * The older services (Contacts v4, Wix Data, Labels) take **offset** paging —
 * `paging.limit` / `paging.offset`, with a `pagingMetadata` envelope carrying
 * `count`, `offset` and `total`. The newer ones (Stores v3, eCommerce) take
 * **cursor** paging — `cursorPaging.limit` / `cursorPaging.cursor`, returning
 * opaque `pagingMetadata.cursors.next` / `.prev` tokens. Offset paging cannot
 * page past a shifting result set consistently; cursor paging cannot jump. Each
 * action exposes whichever its endpoint actually implements rather than
 * inventing a uniform surface that would silently drop the difference.
 */
export interface OffsetPageInput {
  limit?: number;
  offset?: number;
}

export interface CursorPageInput {
  limit?: number;
  cursor?: string;
}

/** `Param[]` fragment for the offset-paged endpoints. */
export const OFFSET_PAGE_PARAMS: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    hint: "Number of items to return. Omit to accept the endpoint's own default.",
  },
  {
    key: "offset",
    label: "Offset",
    type: "number",
    hint: "Number of items to skip in the current sort order.",
  },
];

/** `Param[]` fragment for the cursor-paged endpoints. */
export const CURSOR_PAGE_PARAMS: Param[] = [
  { key: "limit", label: "Limit", type: "number", hint: "Number of items to return." },
  {
    key: "cursor",
    label: "Cursor",
    type: "string",
    hint:
      "Pass the previous response's `pagingMetadata.cursors.next`. When a cursor is sent, Wix ignores filter and sort — set those on the first page only.",
  },
];

/** The `output` fragment every paged action reuses. */
export const PAGING_OUTPUT = [
  { key: "pagingMetadata", type: "object" as const, label: "Paging envelope" },
];

/** Build the dotted query params the GET list endpoints expect (`paging.limit`, …). */
export function offsetPageQuery(
  input: OffsetPageInput,
): Record<string, string | number | undefined> {
  return { "paging.limit": input.limit, "paging.offset": input.offset };
}

/** Build the `paging` object the POST query endpoints expect, or undefined if unset. */
export function offsetPaging(
  input: OffsetPageInput,
): { limit?: number; offset?: number } | undefined {
  if (input.limit === undefined && input.offset === undefined) return undefined;
  return { limit: input.limit, offset: input.offset };
}

/** Build the `cursorPaging` object, or undefined if unset. */
export function cursorPaging(
  input: CursorPageInput,
): { limit?: number; cursor?: string } | undefined {
  if (input.limit === undefined && input.cursor === undefined) return undefined;
  return { limit: input.limit, cursor: input.cursor };
}

/**
 * Drop keys whose value is `undefined`.
 *
 * Wix validates request bodies strictly and several endpoints reject an
 * explicit `null` where they would happily accept an absent key, so optional
 * inputs have to be omitted rather than sent empty.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}
