import type { ActionDefinition } from "@w6w/types";
import { OktaClient } from "../lib/client.ts";

interface Input {
  groupId: string;
  userId: string;
}

const groupAddUser: ActionDefinition<Input> = {
  key: "group-add-user",
  type: "perform",
  resource: "group",
  title: "Add User to Group",
  description: "Add a user to a group. A no-op if the user is already a member.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true },
    { key: "userId", label: "User ID or login", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success, empty body)" }],

  execute(input, ctx) {
    return new OktaClient(ctx).request(
      `/groups/${encodeURIComponent(input.groupId)}/users/${encodeURIComponent(input.userId)}`,
      { method: "PUT" },
    );
  },
};

export default groupAddUser;
