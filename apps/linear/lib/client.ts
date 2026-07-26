import type { HookContext } from "@w6w/types";

/** Linear has exactly one endpoint — everything is a GraphQL POST to it. */
export const API_URL = "https://api.linear.app/graphql";

export interface GraphQLError {
  message: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

/** Drop variables the caller left unset so they don't reach Linear as nulls. */
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
 * Thin GraphQL client over `ctx.fetch`. It never sets Authorization — the
 * runtime routes every request through the auth `sign` hook.
 *
 * GraphQL answers 200 even when the operation failed, with the problems in
 * `errors[]`. Both have to be checked, or a failed mutation reads as a success
 * with an undefined result.
 */
export class LinearClient {
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
      throw new Error(`Linear ${res.status} ${res.statusText}: non-JSON response`);
    }
    if (payload.errors?.length) {
      throw new Error(
        `Linear GraphQL error: ${payload.errors.map((e) => e.message).join("; ")}`,
      );
    }
    if (!res.ok) throw new Error(`Linear ${res.status} ${res.statusText}: ${text}`);
    if (payload.data === undefined) throw new Error("Linear returned no data");
    return payload.data;
  }
}

/**
 * The fragment describing an issue. Shared so every issue-returning operation
 * hands back the same shape rather than each picking its own fields.
 */
export const ISSUE_FIELDS = `
  id
  identifier
  number
  title
  description
  url
  priority
  createdAt
  updatedAt
  state { id name type }
  assignee { id name email }
  team { id key name }
`;
