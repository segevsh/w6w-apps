import type { HookContext } from "@w6w/types";

export const API_URL = "https://partners-endpoint.dice.fm/graphql";
export const VIEWER_QUERY = "query W6WViewer { viewer { id name } }";

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** A live missing/invalid-token probe returns this envelope before GraphQL runs. */
export function isUnauthorized(body: unknown): boolean {
  return isObject(body) && body.error === "unauthorized" && body.key === "error_unauthorized";
}

export async function responseData(response: Response): Promise<Record<string, unknown>> {
  const body: unknown = await response.json().catch(() => null);
  if (isUnauthorized(body)) throw new Error("DICE rejected the API token (error_unauthorized).");
  if (!isObject(body)) {
    throw new Error(`DICE returned a non-object response (HTTP ${response.status}).`);
  }
  // Never return partial data as a complete ticket-holder or financial result.
  // Do not echo arbitrary upstream messages: they may contain query values or personal data.
  if (Array.isArray(body.errors) && body.errors.length) {
    throw new Error(
      `DICE returned ${body.errors.length} GraphQL error(s); check the query and token permissions.`,
    );
  }
  if (body.errors !== undefined && !Array.isArray(body.errors)) {
    throw new Error("DICE returned malformed GraphQL errors.");
  }
  if (!response.ok) throw new Error(`DICE request failed (HTTP ${response.status}).`);
  if (!isObject(body.data)) throw new Error("DICE returned no GraphQL data object.");
  return body.data;
}

export async function query(
  ctx: HookContext,
  document: string,
  variables: Record<string, unknown> = {},
  operationName?: string,
): Promise<Record<string, unknown>> {
  const response = await ctx.fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      query: document,
      variables,
      ...(operationName ? { operationName } : {}),
    }),
  });
  return responseData(response);
}

export function objectInput(value: unknown, field: string): Record<string, unknown> {
  if (value === undefined || value === "") return {};
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`${field} must be a JSON object.`);
    }
  }
  if (!isObject(parsed)) throw new Error(`${field} must be a JSON object.`);
  return parsed;
}

export function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
  return value;
}
