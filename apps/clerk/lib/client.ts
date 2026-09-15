import type { HookContext } from "@w6w/types";

/**
 * Clerk's **Backend API**, verified against
 * [`clerk/openapi-specs`](https://github.com/clerk/openapi-specs) `bapi/2026-05-12.yml` (the
 * vendor's own machine-readable spec — no third-party directory was used) and against a live
 * unauthenticated probe of `api.clerk.com` on 2026-09-15.
 *
 * ## One host for every instance
 *
 * Unlike a platform that keys an integration off a per-tenant subdomain (Auth0's
 * `{tenant}.{region}.auth0.com`), every Clerk instance is reached at the same
 * `https://api.clerk.com/v1`. The Secret Key is what says which instance a call lands on, so
 * there is nothing to derive or normalise here — this client has no notion of "domain".
 *
 * ## The list-shape trap
 *
 * Clerk's own OpenAPI spec is not internally consistent about how a list response is shaped:
 *
 *   - `GET /users`, `GET /sessions` and `GET /invitations` each answer a **bare JSON array**.
 *   - `GET /organizations`, `GET /organizations/{id}/memberships`, `GET /organizations/{id}/invitations`
 *     and `GET /organization_roles` each answer `{ data: [...], total_count: number }`.
 *
 * Nothing in the URL or the request tells you which shape to expect — only the spec's response
 * schema does, and it differs endpoint to endpoint. `requestArray` and `requestEnvelope` are two
 * separate methods rather than one with a flag, so every list action states explicitly which
 * shape its endpoint uses, instead of a caller guessing from a bare array's `.length` and getting
 * `undefined` back from `.data` on the other shape (or vice versa).
 *
 * ## Metadata moved behind its own endpoint
 *
 * As of API version 2026-05-12, `PATCH /users/{id}` and `PATCH /organizations/{id}` reject
 * `public_metadata` / `private_metadata` / `unsafe_metadata` outright (`additionalProperties:
 * false` on the request body — Clerk's own spec omits those keys from the schema entirely).
 * Merging metadata is `PATCH /{resource}/{id}/metadata`, which deep-merges rather than replaces;
 * `null` at any depth deletes that key. This app exposes only the merge form
 * (`user-update-metadata`, `organization-update-metadata`) — replace-in-full is a much easier way
 * to lose sibling keys by accident and isn't exposed.
 */
export const API_BASE = "https://api.clerk.com/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset, so an update does not clobber untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * Clerk's own error envelope — the same shape for every non-2xx response, verified live:
 * `{ errors: [{ message, long_message, code }], clerk_trace_id }`. `code` is the field worth
 * reading before the human `message`: `clerk_key_invalid` names a bad Secret Key specifically,
 * distinct from `authorization_header_format_invalid` (no/malformed header at all) — both answer
 * HTTP 401, so branching on status code alone conflates "you sent no key" with "you sent a key
 * that isn't ours".
 */
export interface ClerkError {
  message?: string;
  long_message?: string;
  code?: string;
}

export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 400);
  let code = "";
  try {
    const body = JSON.parse(text) as { errors?: ClerkError[] };
    const first = body.errors?.[0];
    if (first) {
      detail = first.long_message ?? first.message ?? detail;
      code = first.code ?? "";
    }
  } catch { /* not JSON */ }

  if (status === 429) {
    return `${detail} — Clerk rate-limits the Backend API; back off and retry rather than ` +
      "hammering it";
  }
  if (code === "clerk_key_invalid") {
    return `${detail} — the Secret Key itself is not one Clerk recognises`;
  }
  if (status === 401) {
    return `${detail} — reconnect this app with a valid Secret Key (\`sk_live_…\` or ` +
      "`sk_test_…`)";
  }
  if (status === 403) {
    return `${detail} — this operation is not permitted on the current plan or instance`;
  }
  return code ? `${detail} (${code})` : detail || `${status}`;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime routes every request
 * through the auth `sign` hook.
 */
export class ClerkClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Clerk ${res.status} for ${init.method} ${url.pathname}: ` +
          describeError(res.status, text),
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** For an endpoint documented to answer a bare JSON array. */
  async requestArray<T = unknown>(path: string, options: RequestOptions = {}): Promise<T[]> {
    const body = await this.request<T[]>(path, options);
    return body ?? [];
  }

  /** For an endpoint documented to answer `{ data: T[], total_count: number }`. */
  async requestEnvelope<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ data: T[]; total_count: number }> {
    const body = await this.request<{ data?: T[]; total_count?: number }>(path, options);
    return { data: body?.data ?? [], total_count: body?.total_count ?? 0 };
  }
}
