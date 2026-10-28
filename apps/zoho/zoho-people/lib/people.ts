import type { HookContext } from "@w6w/types";
import { identifier, type RequestOptions, unwrap, ZohoPeopleClient } from "./client.ts";

export const API = "/people/api";

export type Query = Record<string, string | number | boolean | undefined | null>;

/** GET `${API}${path}` and normalise to `{ result, message }`. */
export async function peopleGet(ctx: HookContext, path: string, query?: Query) {
  const body = await new ZohoPeopleClient(ctx).request(`${API}${path}`, { query });
  return unwrap(body);
}

/** Any request, normalised the same way. */
export async function peopleCall(ctx: HookContext, path: string, options: RequestOptions) {
  const body = await new ZohoPeopleClient(ctx).request(path, options);
  return unwrap(body);
}

export function requirePositiveLimit(limit: unknown, max = 200): number | undefined {
  if (limit === undefined || limit === null || limit === "") return undefined;
  const n = Number(limit);
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new Error(`\`limit\` must be an integer between 1 and ${max}.`);
  }
  return n;
}

export { identifier };

/** Exactly one of the three ways Zoho People identifies an employee on an attendance call. */
export function requireEmployeeKey(input: { empId?: string; emailId?: string; mapId?: string }) {
  if (!input.empId && !input.emailId && !input.mapId) {
    throw new Error("Provide at least one of `empId`, `emailId` or `mapId`.");
  }
}
