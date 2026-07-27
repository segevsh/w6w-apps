import type { HookContext } from "@w6w/types";

/**
 * monday.com is GraphQL-only: every call is a POST to this single endpoint with
 * a `{ query, variables }` JSON body. There is no REST surface.
 */
export const API_URL = "https://api.monday.com/v2";

/**
 * monday versions its schema by date and asks callers to pin a version so a
 * breaking schema change never surprises a running integration. `2024-10` is a
 * stable release; the header is sent on every request (it is not auth, so the
 * client owns it rather than the `sign` hook).
 */
export const API_VERSION = "2024-10";

export interface GraphQLError {
  message: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

/** Drop variables the caller left unset so they don't reach monday as nulls. */
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

/**
 * monday's `JSON` GraphQL scalar wants a *string* of JSON, not an object — the
 * column-value mutations take `column_values: JSON`. Validate the caller's text
 * is real JSON, then re-encode it canonically. Throws a clear error rather than
 * letting monday reject an opaque payload.
 */
export function jsonArg(v: string | undefined): string | undefined {
  if (!v) return undefined;
  try {
    return JSON.stringify(JSON.parse(v));
  } catch {
    throw new Error("column values must be a valid JSON object string");
  }
}

/**
 * Thin GraphQL client over `ctx.fetch`. It never sets Authorization — the
 * runtime routes every request through the auth `sign` hook — but it does set
 * `API-Version`, which is transport metadata, not a credential.
 *
 * GraphQL answers 200 even when the operation failed, with the problems in
 * `errors[]`. Both have to be checked, or a failed mutation reads as a success
 * with an undefined result.
 */
export class MondayClient {
  constructor(private ctx: HookContext) {}

  async query<T = unknown>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const res = await this.ctx.fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "api-version": API_VERSION,
      },
      body: JSON.stringify({ query, variables: compact(variables) }),
    });

    const text = await res.text();
    let payload: GraphQLResponse<T>;
    try {
      payload = JSON.parse(text) as GraphQLResponse<T>;
    } catch {
      throw new Error(`monday ${res.status} ${res.statusText}: non-JSON response`);
    }
    if (payload.errors?.length) {
      throw new Error(
        `monday GraphQL error: ${payload.errors.map((e) => e.message).join("; ")}`,
      );
    }
    if (!res.ok) throw new Error(`monday ${res.status} ${res.statusText}: ${text}`);
    if (payload.data === undefined) throw new Error("monday returned no data");
    return payload.data;
  }
}

/** Fields returned for a board — shared so every board op hands back the same shape. */
export const BOARD_FIELDS = `
  id
  name
  description
  state
  board_kind
  board_folder_id
`;

/** Fields returned for an item, including its column values. */
export const ITEM_FIELDS = `
  id
  name
  state
  created_at
  column_values {
    id
    text
    type
    value
  }
`;
