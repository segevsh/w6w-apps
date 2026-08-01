import type { HookContext } from "@w6w/types";

/**
 * The Cloudflare REST API v4 base. Verified against
 * https://developers.cloudflare.com/fundamentals/api/reference/ (2026-08-01).
 */
export const API_BASE = "https://api.cloudflare.com/client/v4";

export interface CloudflareApiError {
  code: number;
  message: string;
}

export interface CloudflareResultInfo {
  page?: number;
  per_page?: number;
  count?: number;
  total_count?: number;
  total_pages?: number;
}

/**
 * Every Cloudflare REST API response — success or failure — is wrapped in the
 * same envelope: `{ success, result, errors, messages }`. Cloudflare can
 * return `success: false` on an HTTP 200, so both layers must be checked.
 */
export interface CloudflareEnvelope<T> {
  success: boolean;
  errors: CloudflareApiError[];
  messages: CloudflareApiError[];
  result: T;
  result_info?: CloudflareResultInfo;
}

function formatErrors(errors: CloudflareApiError[] | undefined): string {
  if (!errors || errors.length === 0) return "no error detail";
  return errors.map((e) => `${e.code}: ${e.message}`).join("; ");
}

/**
 * Call the Cloudflare REST API and unwrap its `{ success, result, errors }`
 * envelope, throwing a descriptive `Error` on either an HTTP failure or a
 * `success: false` body. `path` is relative to {@link API_BASE} (e.g.
 * `/zones`).
 */
export async function cfFetch<T>(
  ctx: HookContext,
  path: string,
  init?: RequestInit,
): Promise<CloudflareEnvelope<T>> {
  const res = await ctx.fetch(`${API_BASE}${path}`, init);
  const body = await res.json().catch(() => undefined) as CloudflareEnvelope<T> | undefined;

  if (!res.ok) {
    throw new Error(`Cloudflare API ${path} returned ${res.status}: ${formatErrors(body?.errors)}`);
  }
  if (!body || body.success !== true) {
    throw new Error(`Cloudflare API ${path} reported failure: ${formatErrors(body?.errors)}`);
  }
  return body;
}

export interface CloudflareGraphQLError {
  message: string;
}

/**
 * The GraphQL Analytics API shares the same host, base path and Bearer auth
 * as the REST API (`POST /graphql`), but its own envelope: `{ data, errors }`
 * per the GraphQL spec, not the REST `{ success, result }` shape.
 * https://developers.cloudflare.com/analytics/graphql-api/getting-started/execute-graphql-query/
 */
export async function cfGraphQL<T>(
  ctx: HookContext,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await ctx.fetch(`${API_BASE}/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => undefined) as
    | { data?: T; errors?: CloudflareGraphQLError[] }
    | undefined;

  if (!res.ok) {
    throw new Error(
      `Cloudflare GraphQL API returned ${res.status}: ${
        body?.errors?.map((e) => e.message).join("; ") ?? "no error detail"
      }`,
    );
  }
  if (!body || (body.errors && body.errors.length > 0)) {
    throw new Error(
      `Cloudflare GraphQL API reported errors: ${
        body?.errors?.map((e) => e.message).join("; ") ?? "unknown error"
      }`,
    );
  }
  return body.data as T;
}
