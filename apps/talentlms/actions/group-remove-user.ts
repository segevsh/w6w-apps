import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  userId: number;
  groupId: number;
}

const groupRemoveUser: ActionDefinition<Input> = {
  key: "group-remove-user",
  type: "perform",
  resource: "group",
  title: "Remove User from Group",
  description: "Remove a user from a group.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    { key: "groupId", label: "Group ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("removeuserfromgroup", {
      user_id: input.userId,
      group_id: input.groupId,
    });
  },
};

export default groupRemoveUser;
