import type { ActionDefinition } from "@w6w/types";
import { csv, SmartsheetClient } from "../lib/client.ts";

interface Input {
  include?: string[];
}

/**
 * `GET /users/me` — the token's own user.
 *
 * The scope-free whoami: every token can read its own user, with no sheet, no
 * workspace and no admin right involved. That is what makes it the right
 * liveness probe, and the auth `test` and `afterConnect` hooks use the same
 * endpoint.
 *
 * `include=groups` is the operation's only include value, and adds "an array of
 * groups (groupId, name, and description only) that the user is a member of".
 *
 * Deliberately NOT tagged with `healthCheck`. The runtime already derives an
 * `auth:access-token` credential check from this app's `test` hook, which probes
 * this same endpoint — promoting the action too would give the health surface
 * two entries asking one question.
 */
const getCurrentUser: ActionDefinition<Input> = {
  key: "get-current-user",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description:
    "Get the user the connected token belongs to. Needs no permissions beyond a valid token, so " +
    "it doubles as a connection liveness check.",
  params: [
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [
        { value: "groups", label: "groups — groupId, name and description of each membership" },
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "account", type: "object", label: "The user's account" },
  ],

  execute(input, ctx) {
    return new SmartsheetClient(ctx).request("/users/me", {
      query: { include: csv(input.include) },
    });
  },
};

export default getCurrentUser;
