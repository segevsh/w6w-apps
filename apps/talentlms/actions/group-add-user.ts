import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  userId: number;
  groupKey: string;
}

const groupAddUser: ActionDefinition<Input> = {
  key: "group-add-user",
  type: "perform",
  resource: "group",
  title: "Add User to Group",
  description: "Add a user to a group by the group's key; they join its courses.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    { key: "groupKey", label: "Group key", type: "string", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("addusertogroup", {
      user_id: input.userId,
      group_key: input.groupKey,
    });
  },
};

export default groupAddUser;
