import type { ActionDefinition } from "@w6w/types";
import { LemlistClient } from "../lib/client.ts";

interface Input {
  version?: "v2";
}

/**
 * `GET /team?version=v2` — the team, **and its members**.
 *
 * This is also how you list team members: lemlist documents `version` on this
 * route as "Set to `v2` to include the `users` array, listing each team member's
 * `userId`, `name`, `email`, and `role`. This lets you retrieve the team and its
 * members in a single request." There is no separate `/team/users` endpoint —
 * only `GET /users/{userId}` for one user by id — so the member list is a
 * property of the team, and this action defaults `version` to `v2` to make sure
 * it comes back.
 *
 * Without `v2` the response carries only `userIds` (ids, no names or emails).
 *
 * This is also the app's auth probe: `auth/api-key.ts` calls the same route,
 * because every key can read its own team regardless of role.
 */
const getTeam: ActionDefinition<Input> = {
  key: "get-team",
  type: "read",
  resource: "team",
  title: "Get Team",
  description:
    "Fetch the team behind the API key, including the members array (userId, name, email, role) and configured webhooks.",
  params: [
    {
      key: "version",
      label: "API version",
      type: "select",
      options: [{ value: "v2", label: "v2" }],
      default: "v2",
      hint:
        "`v2` is what adds the `users` array of team members. Without it you get bare `userIds`.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Team id" },
    { key: "name", type: "string", label: "Team name" },
    { key: "users", type: "array", label: "Team members (v2 only)" },
    { key: "userIds", type: "array", label: "Team member ids" },
    { key: "hooks", type: "array", label: "Configured webhooks" },
  ],

  execute(input, ctx) {
    return new LemlistClient(ctx).request("/team", {
      query: { version: input.version ?? "v2" },
    });
  },
};

export default getTeam;
