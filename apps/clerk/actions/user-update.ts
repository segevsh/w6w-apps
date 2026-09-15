import type { ActionDefinition } from "@w6w/types";
import { ClerkClient, compact } from "../lib/client.ts";
import { USER_ID_PARAM } from "../lib/params.ts";

/**
 * `PATCH /users/{user_id}` — attributes only.
 *
 * As of Backend API version 2026-05-12, this endpoint's request schema has
 * `additionalProperties: false` and does not list `public_metadata`, `private_metadata` or
 * `unsafe_metadata` among its properties — Clerk rejects them here now. Use `user-update-metadata`
 * instead, which merges rather than replaces.
 */
const action: ActionDefinition = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update user",
  description: "Update a user's name, username, or password. Does not touch metadata — use " +
    '"Update user metadata" for that.',
  idempotent: true,
  params: [
    USER_ID_PARAM,
    { key: "firstName", label: "First name", type: "string", default: "" },
    { key: "lastName", label: "Last name", type: "string", default: "" },
    { key: "username", label: "Username", type: "string", default: "" },
    {
      key: "password",
      label: "New password",
      type: "secret",
      default: "",
      advanced: true,
    },
    {
      key: "signOutOfOtherSessions",
      label: "Sign out of other sessions",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Only applies when setting a new password.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "updated_at", type: "number", label: "Updated at (unix ms)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");

    return await new ClerkClient(ctx).request(`/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: compact({
        first_name: p.firstName,
        last_name: p.lastName,
        username: p.username,
        password: p.password,
        sign_out_of_other_sessions: p.signOutOfOtherSessions === true ? true : undefined,
      }),
    });
  },
};
export default action;
