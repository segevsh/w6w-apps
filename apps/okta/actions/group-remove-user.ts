import type { ActionDefinition } from "@w6w/types";
import { OktaClient } from "../lib/client.ts";

interface Input {
  groupId: string;
  userId: string;
}

/**
 * Only works on groups of type `OKTA_GROUP` — Okta rejects this for
 * `APP_GROUP` (imported from a downstream app) or `BUILT_IN` groups, since
 * their membership is owned elsewhere.
 */
const groupRemoveUser: ActionDefinition<Input> = {
  key: "group-remove-user",
  type: "perform",
  resource: "group",
  title: "Remove User from Group",
  description:
    "Remove a user from an Okta-native group. Not valid for app-imported or built-in groups.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true },
    { key: "userId", label: "User ID or login", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success, empty body)" }],

  execute(input, ctx) {
    return new OktaClient(ctx).request(
      `/groups/${encodeURIComponent(input.groupId)}/users/${encodeURIComponent(input.userId)}`,
      { method: "DELETE" },
    );
  },
};

export default groupRemoveUser;
