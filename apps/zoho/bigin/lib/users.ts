/**
 * Bigin's user endpoints (`GET /bigin/v2/users`), verified 2026-09-22 against
 * https://www.bigin.com/developer/docs/apis/v2/get-users.html.
 *
 * Two things about this surface are worth knowing before reading the code:
 *
 *   - **The envelope key is `users`, not `data`.** A list answers
 *     `{"users":[...],"info":{...}}` — the per-record `data` array insert /
 *     update / delete use is not reused here. `getUser` unwraps the same
 *     `users` array for the single-user form, and tolerates a `data` key as
 *     well rather than throwing on the one page shape the docs sample only
 *     once for both endpoints.
 *   - **`type=CurrentUser` is the cheapest authenticated call this app knows**
 *     (one credit per the API Limits page) and it returns the *calling* user's
 *     own profile. That makes it the `auth/oauth2.ts` `test` probe: it proves
 *     the token works without an endpoint that hands back the credential, and
 *     without needing any record or module permission beyond
 *     `ZohoBigin.users.READ`.
 */
import type { HookContext } from "@w6w/types";
import { BiginClient } from "./client.ts";
import type { BiginListInfo } from "./records.ts";

/**
 * The documented `type` values (`get-users.html`). `CurrentUser` is what the
 * auth probe uses; the rest are for resolving a record's owner.
 */
export const USER_TYPES = [
  "AllUsers",
  "ActiveUsers",
  "DeactiveUsers",
  "ConfirmedUsers",
  "NotConfirmedUsers",
  "DeletedUsers",
  "ActiveConfirmedUsers",
  "AdminUsers",
  "ActiveConfirmedAdmins",
  "CurrentUser",
] as const;

export const DEFAULT_USER_TYPE = "AllUsers";

export interface UsersResponse<T = Record<string, unknown>> {
  users: T[];
  info?: BiginListInfo;
}

export interface ListUsersInput {
  type?: string;
  page?: number;
  per_page?: number;
}

export function listUsers(ctx: HookContext, input: ListUsersInput): Promise<UsersResponse> {
  return new BiginClient(ctx).request("/users", {
    query: { type: input.type, page: input.page, per_page: input.per_page },
  });
}

export interface GetUserInput {
  userId: string;
}

/** `GET /users/{user_id}`. */
export async function getUser(
  ctx: HookContext,
  input: GetUserInput,
): Promise<Record<string, unknown>> {
  const res = await new BiginClient(ctx).request<
    { users?: Record<string, unknown>[]; data?: Record<string, unknown>[] }
  >(`/users/${encodeURIComponent(input.userId)}`);
  const user = res.users?.[0] ?? res.data?.[0];
  if (!user) throw new Error(`Bigin returned no user for id ${input.userId}`);
  return user;
}

/**
 * The cheapest authenticated call this app knows — one credit per the API
 * Limits page, and it needs only `ZohoBigin.users.READ` (a subset of the
 * `ZohoBigin.users.ALL` scope the app requests). Both the `oauth2` auth
 * method's `test` hook and the `quota` health check probe it; it is kept in
 * one place so they cannot drift.
 */
export const CURRENT_USER_PATH = "/users?type=CurrentUser";
