import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.bexio.com";

/**
 * bexio's error body, documented under "Errors" in the API reference:
 * every non-2xx response is `{"error_code": <int>, "message": "<string>"}`.
 * Read this — never the HTTP status alone — to tell a real failure from a
 * shape a caller can recover from.
 */
export interface BexioErrorBody {
  error_code?: number;
  message?: string;
}

export class BexioApiError extends Error {
  constructor(public status: number, public body: BexioErrorBody | undefined, path: string) {
    super(
      body?.message
        ? `bexio ${status} for ${path}: ${body.message}`
        : `bexio ${status} for ${path}`,
    );
    this.name = "BexioApiError";
  }
}

/** Drop keys the caller left unset so optional params don't overwrite fields with nulls. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export interface ListQuery {
  orderBy?: string;
  descending?: boolean;
  limit?: number;
  offset?: number;
  showArchived?: boolean;
}

/**
 * Every list/search endpoint takes the same four query params. `order_by`'s
 * valid values are resource-specific (an action's `orderBy` param enumerates
 * them); direction is a separate `_asc`/`_desc` suffix bexio appends to the
 * same value rather than a distinct parameter.
 */
export function listQuery(q: ListQuery): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (q.orderBy) out.order_by = q.descending ? `${q.orderBy}_desc` : q.orderBy;
  if (q.limit !== undefined) out.limit = q.limit;
  if (q.offset !== undefined) out.offset = q.offset;
  if (q.showArchived !== undefined) out.show_archived = q.showArchived;
  return out;
}

/** One criterion of a `POST /<resource>/search` body — bexio's own search DSL. */
export interface SearchCriterion {
  field: string;
  value: string | number;
  criteria?:
    | "="
    | "equal"
    | "!="
    | "not_equal"
    | ">"
    | "greater_than"
    | ">="
    | "greater_equal"
    | "<"
    | "less_than"
    | "<="
    | "less_equal"
    | "like"
    | "not_like"
    | "is_null"
    | "not_null"
    | "in"
    | "not_in";
}

/**
 * Thin wrapper over `ctx.fetch` for the bexio REST API (v2/v3/v4 all live
 * under `api.bexio.com`, so this one client covers every action here).
 *
 * `Accept: application/json` is sent on every call — the OpenAPI document
 * marks it as a REQUIRED header parameter on every single operation, not
 * just an implicit default a JSON client happens to send.
 *
 * bexio has no `PUT`/`PATCH` in this surface: editing an existing resource
 * is a `POST` to the same collection path with an id in the URL, using the
 * identical request schema as create. There is no separate "edit" verb.
 */
export class BexioClient {
  constructor(private ctx: HookContext) {}

  private async request<T = unknown>(
    path: string,
    method: string,
    query?: Record<string, string | number | boolean | undefined>,
    body?: unknown,
  ): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    const parsed = text ? (JSON.parse(text) as unknown) : undefined;
    if (!res.ok) {
      throw new BexioApiError(res.status, parsed as BexioErrorBody | undefined, path);
    }
    return parsed as T;
  }

  list<T = unknown>(path: string, query?: Record<string, string | number | boolean>): Promise<T> {
    return this.request<T>(path, "GET", query);
  }

  get<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, "GET");
  }

  /** Create AND edit both go through this — see the class doc. */
  post<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, "POST", undefined, compact(body));
  }

  search<T = unknown>(
    path: string,
    criteria: SearchCriterion[],
    query?: Record<string, string | number | boolean>,
  ): Promise<T> {
    return this.request<T>(path, "POST", query, criteria);
  }

  delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, "DELETE");
  }
}
