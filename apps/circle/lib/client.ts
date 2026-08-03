import type { HookContext } from "@w6w/types";

/**
 * Circle Admin API v2 client.
 *
 * ## Which Circle, and which of its APIs
 *
 * This app is **circle.so — the community platform** (spaces, posts, courses,
 * events, paywalled memberships). It is not circle.com, the USDC/stablecoin
 * company, whose developer portal lives at `developers.circle.com` and shares
 * nothing but a word. Every host, doc link and field name here comes from
 * `api.circle.so`.
 *
 * Circle publishes **four** API surfaces, and they are not interchangeable
 * (`https://api.circle.so/llms.txt`, fetched 2026-08-03):
 *
 *   | Surface        | Base                          | Credential                          |
 *   | -------------- | ----------------------------- | ----------------------------------- |
 *   | Admin API v1   | `app.circle.so/api/v1`        | an **Admin V1** token               |
 *   | Admin API v2   | `app.circle.so/api/admin/v2`  | an **Admin V2** token — this app    |
 *   | Headless Member| `api-headless.circle.so`      | a per-member JWT                    |
 *   | Headless Auth  | `api-headless.circle.so`      | a headless token                    |
 *
 * Circle is explicit that the token types do not cross over: "Tokens are
 * type-specific as well — for example, Admin V2 tokens won't work on Headless
 * Auth API. A wrong token type will also result in a 403"
 * (`/apis/admin-api/usage-and-limits/optimizing-usage`). So mixing surfaces in
 * one App would mean two credentials pretending to be one. This App implements
 * **v2 only**; `auth/api-token.ts` explains why v1 was rejected and
 * `README.md` records the wire evidence.
 *
 * ## One host, no per-tenant base URL
 *
 * Unlike the sibling `discourse`/`wordpress` apps, there is nothing to
 * parameterise. Circle is fully vendor-hosted: every community's Admin API is
 * served from `app.circle.so`, and the token — not a subdomain, not a header —
 * is what identifies the community ("Your unique API token identifies your
 * community within Circle's server", `/apis/admin-api/quick-start`). Confirmed
 * on the wire 2026-08-03: `GET https://app.circle.so/api/admin/v2/community`
 * with no `host` header reaches token validation and answers
 * `{"success":false,"message":"API token not found."}` — i.e. it routed fine.
 *
 * That is why `network.allow` is the single literal `app.circle.so` rather than
 * a wildcard, and why no action takes a base-URL parameter.
 *
 * A custom community domain (`community.example.com`) is a **front-end**
 * vanity domain. The v2 OpenAPI document does declare a second security scheme,
 * an apiKey named `host` in a header, alongside `token_auth` on every operation
 * — but no page of Circle's documentation mentions it, no published example
 * sends it, and the live 401 above proves it is not needed to route. Shipping a
 * header we cannot verify the semantics of would be guessing, so this client
 * does not send one. If a community ever turns out to need it, it belongs on
 * the Connection (it identifies the community, like the token), never on an
 * Action.
 *
 * ## What this client does NOT do
 *
 * It never sets `Authorization`. That header is stamped by
 * `auth/api-token.ts`'s `sign` hook, the only place the token is visible.
 * Actions reach the network exclusively through here, and here exclusively
 * through `ctx.fetch`.
 */

/** The one host this App talks to. Mirrored by `w6w.network.allow`. */
export const API_HOST = "app.circle.so";

/** Base URL of the Admin API v2. Every path in this app hangs off it. */
export const API_URL = `https://${API_HOST}/api/admin/v2`;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Array values are repeated as `k[]=a&k[]=b`, which is what Rails parses. */
  query?: Record<string, QueryValue | QueryValue[]>;
  body?: Record<string, unknown>;
}

/**
 * Drop keys the caller left unset.
 *
 * `undefined`, `null` and `""` all mean "not supplied". Circle's update
 * endpoints ignore absent keys and document no null-clears-it semantics, so
 * forwarding a blank would only risk a 422 on a field the user never touched —
 * and a 4xx is not free here: Circle counts 400/401/403/404/405/422/429 against
 * the community's monthly request allowance
 * (`/apis/admin-api/usage-and-limits`). `false` and `0` survive, because on
 * this API they are meaningful values rather than absences.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/**
 * Split a comma-separated form field into the integer array Circle wants.
 *
 * Several v2 parameters are typed `array` of `integer` — `space_ids`,
 * `space_group_ids`, `member_tag_ids`, `topics` — and Circle's own advice is to
 * use them rather than looping: "to add a member to multiple spaces or space
 * groups, you can pass a list of space_ids or space_group_ids in a single call
 * instead of making multiple requests" (`/apis/admin-api/usage-and-limits/optimizing-usage`).
 *
 * This is the one place that shape is built, so no action hand-rolls a `split`
 * that forgets to trim or lets `NaN` through. A field containing no usable
 * number returns `undefined` rather than `[]`: an empty array is a *value* on
 * a PUT (it would clear the association), and a user who typed whitespace did
 * not ask for that.
 */
export function idList(v: string | undefined): number[] | undefined {
  if (!v) return undefined;
  const items = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  return items.length ? items : undefined;
}

/** Parse a JSON param that a workflow author may have supplied as a string. */
export function jsonObject(
  v: unknown,
  label: string,
): Record<string, unknown> | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "object") return v as Record<string, unknown>;
  if (typeof v !== "string") throw new Error(`${label} must be a JSON object`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(v);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Circle's error envelope, from the v2 OpenAPI `error` schema and confirmed on
 * the wire: `{ "success": false, "message": "…", "error_details": {} }`.
 */
interface CircleError {
  success?: boolean;
  message?: string;
  error_details?: unknown;
}

/**
 * Pull the human half out of an error body, falling back to the raw text.
 *
 * Exported so the auth `test` hook and the unit tests read errors the same way
 * the client does. The token never enters this module, so nothing it returns
 * can carry credential material.
 */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as CircleError;
    if (typeof body?.message === "string" && body.message) return body.message;
  } catch {
    // Not JSON — Cloudflare and Rails both serve HTML on some failures.
  }
  return text.slice(0, 400);
}

export class CircleClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (Array.isArray(v)) {
        // Rails reads a repeated `k[]` into an array. A single comma-joined
        // value would arrive as one string and be coerced to a single id.
        for (const item of v) {
          if (item === undefined || item === null || item === "") continue;
          url.searchParams.append(`${k}[]`, String(item));
        }
        continue;
      }
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
    if (!res.ok) {
      const detail = errorMessage(await res.text().catch(() => ""));
      throw new Error(
        `Circle ${res.status} ${res.statusText} for ${init.method} ${url.pathname}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
