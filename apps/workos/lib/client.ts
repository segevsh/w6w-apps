import type { HookContext } from "@w6w/types";

/**
 * WorkOS's API.
 *
 * Paths come from WorkOS's reference (`workos.com/docs/reference`) and every one
 * this app calls was verified to route against `api.workos.com` on 2026-08-18 —
 * each answering `401 {"message":"Unauthorized"}` where an unknown path answers
 * a `404`, so the 401s are proof the route exists.
 *
 * ## What WorkOS is, and why that shapes the app
 *
 * WorkOS sells the things a B2B product has to add before an enterprise will
 * buy it: SSO against the customer's identity provider, SCIM user provisioning,
 * audit logs. The unit is therefore an **Organization** — one customer company
 * — and almost everything hangs off one.
 *
 * That means two of these actions are worth more than the rest:
 *
 *   - **`portal-link-create`** mints a hosted page where the *customer's* IT
 *     administrator configures their own SSO or SCIM. It is how the setup
 *     happens without an engineer on a call, which is most of what WorkOS is
 *     for.
 *   - **`event-list`** is the one correct way to follow directory changes.
 *     Polling `directory-user-list` tells you what is true now; the event
 *     stream tells you what *changed*, in order, including the deletions that
 *     leave no trace in a listing.
 *
 * ## Pagination is a cursor, and the events endpoint is stricter
 *
 * Lists page with `limit` (max 100) and `after`, and answer
 * `{data, list_metadata: {before, after}}`. The events endpoint adds a
 * requirement the others do not have: **`events` is mandatory**, so there is no
 * "read everything" — a caller must name the event types it wants.
 */
export const BASE_URL = "https://api.workos.com";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string> | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset, so an update does not clear untouched fields. */
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
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class WorkOSClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        // WorkOS takes repeated keys for list parameters.
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
        `WorkOS ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow WorkOS's `after` cursor, collecting `data`.
   *
   * Every list answers `{data, list_metadata: {before, after}}`; a null `after`
   * is the end. The cursor is an object id, not an opaque blob, which is why a
   * resumable job can store it and mean something by it.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<{ items: T[]; after?: string }> {
    const items: T[] = [];
    let after: string | undefined;

    while (items.length < wantTotal) {
      const limit = Math.min(100, Math.max(1, wantTotal - items.length));
      const body = await this.request<
        { data?: T[]; list_metadata?: { after?: string | null } }
      >(path, { ...options, query: { ...options.query, limit, after } });
      const chunk = body?.data ?? [];
      items.push(...chunk);
      after = body?.list_metadata?.after ?? undefined;
      if (!after || chunk.length === 0) break;
    }
    return {
      items: Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items,
      after,
    };
  }
}

/**
 * Turn a WorkOS error into something actionable.
 *
 * WorkOS answers `{"message":"…"}` for authentication and, for a validation
 * failure, `{"code","message","errors":[{"field","code"}]}` — the `errors`
 * array naming what was wrong, which is the half worth surfacing.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as {
      message?: string;
      error?: string;
      error_description?: string;
      code?: string;
      errors?: Array<{ field?: string; code?: string }>;
    };
    detail = body?.message ?? body?.error_description ?? body?.error ?? detail;
    if (Array.isArray(body?.errors) && body.errors.length > 0) {
      const fields = body.errors.map((e) => `${e.field}: ${e.code}`).join("; ");
      detail = `${detail} (${fields})`;
    } else if (body?.code) {
      detail = `${detail} (${body.code})`;
    }
  } catch { /* not JSON */ }

  if (status === 401) {
    return `${detail} — check the API key, and that it is the right environment: a staging key ` +
      "and a production key differ by their `sk_test_` / `sk_live_` prefix and see different data";
  }
  if (status === 422) {
    return `${detail} — WorkOS validated the request and named the field above`;
  }
  return detail || `${status}`;
}
