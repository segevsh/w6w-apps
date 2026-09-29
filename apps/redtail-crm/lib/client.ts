import type { HookContext } from "@w6w/types";

/**
 * Redtail CRM's public REST API — verified against the vendor's own Postman
 * collection ("TWAPI Documentation", `documenter.getpostman.com/view/7873823/SVzxXyzn`,
 * fetched from its `documenter.gw.postman.com/api/collections/...` JSON export on
 * 2026-09-15) and live probes against the two candidate hosts on the same date.
 *
 * ## Base URL
 *
 * **`https://crm.redtailtechnology.com/api/public/v1`** — NOT
 * `api2.redtailtechnology.com/crm/v1`, a third-party-documented alternative that
 * turned out to be a *different*, legacy XML API: probed live, it answers
 * `Content-Type: application/xml` with a `<Login xmlns="...REDTAIL.Model">`
 * envelope (`Status`, `Message`, `CID`, …) — not the JSON shape this collection
 * documents. The `crm.redtailtechnology.com` host answers `401
 * {"message":"Authorization header missing"}` on the same unauthenticated probe,
 * matching the collection's own JSON examples exactly, and every worked
 * `localhost:3000/api/public/v1/...` example URL in the collection (left
 * un-templated in a few requests) confirms the `/api/public/v1` path prefix.
 *
 * ## Auth is a two-step exchange, not a single header
 *
 * `GET /authentication` takes `Authorization: Basic base64(APIKey:Username:Password)`
 * and returns `{redtail_database_id, redtail_user_id, user_key}`. Every OTHER
 * endpoint is signed with a *different* scheme built from that response:
 * `Authorization: UserKeyAuth base64(APIKey:UserKey)`. This is not inferred —
 * the collection's own captured `originalRequest` history for "Contacts GET"
 * and an Opportunities call carries a literal `UserKeyAuth base64(...)` header
 * whose decoded value is `1855B9E3-CD88-402E-909B-130F2AC174FC:2F1DB82B-9562-
 * 4CE2-B88B-02035C95490F` — and that second half is exactly the `user_key` the
 * collection's own `/authentication` example response returns for the same
 * demo database. See `auth/database-credentials.ts` for the resulting
 * `exchange`/`sign` split.
 *
 * ## Pagination
 *
 * Page-based via a single `?page=N` query param (1-indexed). Every list
 * response's body carries `meta: { total_records, total_pages }` — there is
 * no `Link`/`X-Total` header. The `/contacts` family (list, search,
 * search_basic, get-by-id) additionally documents two per-request **headers**
 * (not query params): `pagesize` (overrides the default page size of 50) and
 * `include` (a comma-separated list of dependent records — addresses, phones,
 * emails, urls, family, tag_memberships, important_information, social_medias,
 * photos, activities, sam — to attach to each contact). Neither is documented
 * for any other list endpoint (opportunities, activities, notes), so only the
 * contact actions expose them.
 *
 * ## Rate limiting
 *
 * Not documented anywhere in the collection (`grep`-checked for "rate limit"/
 * "throttle"/"X-RateLimit" — zero hits), and a live unauthenticated probe on
 * 2026-09-15 carried no rate-limit header of any kind. `health/quota.ts`
 * declares this absence rather than guessing.
 *
 * ## Error envelope
 *
 * Every documented 4xx response in the collection (401/403/422, live-probed
 * 401s included) is `{"message": "..."}`, occasionally with extra
 * endpoint-specific fields (e.g. `expected_outcomes` on a workflow-step 422).
 * `errorMessage` below reads just the `message` field, falling back to the raw
 * text when the body isn't that shape.
 */
export const API_URL = "https://crm.redtailtechnology.com/api/public/v1";

/** Normalise Redtail's `{"message": "..."}` error envelope to a readable string. */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as { message?: string };
    if (typeof body.message === "string" && body.message) return body.message;
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return text;
}

/** Drop keys the caller left `undefined` so a PUT never nulls out an untouched field. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent, matching how every optional string param in this app behaves. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

export interface RedtailMeta {
  total_records?: number;
  total_pages?: number;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Extra request headers — e.g. the `/contacts` family's `pagesize`/`include`. */
  headers?: Record<string, string | number | undefined | null>;
  body?: Record<string, unknown>;
}

export interface RedtailResult<T> {
  data: T;
  meta?: RedtailMeta;
  status: number;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook, which is the only code
 * handed the credential.
 */
export class RedtailClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<RedtailResult<T>> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    for (const [k, v] of Object.entries(options.headers ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      headers[k] = String(v);
    }
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      const detail = errorMessage(text);
      throw new Error(
        `Redtail ${res.status} ${res.statusText} for ${init.method} ${url.pathname}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    const data = text ? (JSON.parse(text) as T & { meta?: RedtailMeta }) : (undefined as T);
    const meta = data && typeof data === "object"
      ? (data as { meta?: RedtailMeta }).meta
      : undefined;
    return { data, meta, status: res.status };
  }
}
