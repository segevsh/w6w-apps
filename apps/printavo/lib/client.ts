import type { HookContext } from "@w6w/types";

/**
 * Printavo API v2 — a single GraphQL endpoint, `POST https://www.printavo.com/api/v2`.
 * Reference: https://www.printavo.com/docs/api/v2 (queries, mutations, objects, inputs, enums).
 *
 * Two behaviours worth knowing, both observed live (2026-10-06):
 *
 *   - Errors travel in the body with HTTP 200. An unauthenticated `{ user { id } }` answers
 *     `200 {"errors":[{"message":"Unauthorized","extensions":{"code":403}}],"data":null}` — the
 *     HTTP status is not the verdict, so `errors[]` is always checked.
 *   - Schema errors (unknown field) carry `extensions.code` as a string ("undefinedField").
 *
 * The credential (`email` + `token` headers) is never set here; the auth `sign` hook adds it.
 */
export const API_URL = "https://www.printavo.com/api/v2";

export interface GraphQLError {
  message: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

interface GraphQLResponse<T> {
  data?: T | null;
  errors?: GraphQLError[];
}

/** Drop variables the caller left unset so they don't reach Printavo as nulls. */
export function compact(vars: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** `IDInput` (`{ id }`) for a reference field, or undefined when the id is unset. */
export function idRef(id: string | undefined): { id: string } | undefined {
  return id ? { id } : undefined;
}

/** Page size sent as `first`; 25 unless the caller says otherwise. */
export const DEFAULT_PAGE_SIZE = 25;

export interface Page<T> {
  nodes: T[];
  totalNodes?: number;
  hasNextPage: boolean;
  endCursor: string | null;
}

interface RawConnection<T> {
  nodes: T[];
  totalNodes?: number;
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

/** Flatten a GraphQL connection into `{ nodes, totalNodes?, hasNextPage, endCursor }`. */
export function toPage<T>(conn: RawConnection<T> | null | undefined): Page<T> {
  const page: Page<T> = {
    nodes: conn?.nodes ?? [],
    hasNextPage: conn?.pageInfo?.hasNextPage ?? false,
    endCursor: conn?.pageInfo?.endCursor ?? null,
  };
  if (conn?.totalNodes !== undefined) page.totalNodes = conn.totalNodes;
  return page;
}

/** Thin GraphQL client over `ctx.fetch`. */
export class PrintavoClient {
  constructor(private ctx: HookContext) {}

  async query<T = unknown>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const res = await this.ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query, variables: compact(variables) }),
    });
    const text = await res.text();
    let payload: GraphQLResponse<T>;
    try {
      payload = JSON.parse(text) as GraphQLResponse<T>;
    } catch {
      throw new Error(`Printavo ${res.status} ${res.statusText}: non-JSON response`);
    }
    if (payload.errors?.length) {
      throw new Error(
        `Printavo GraphQL error: ${payload.errors.map((e) => e.message).join("; ")}`,
      );
    }
    if (!res.ok) throw new Error(`Printavo ${res.status} ${res.statusText}: ${text}`);
    if (payload.data === undefined || payload.data === null) {
      throw new Error("Printavo returned no data");
    }
    return payload.data;
  }
}
