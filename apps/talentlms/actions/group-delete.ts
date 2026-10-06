import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  groupId: number;
  deletedByUserId?: number;
}

const groupDelete: ActionDefinition<Input> = {
  key: "group-delete",
  type: "perform",
  resource: "group",
  title: "Delete Group",
  description: "Delete a group.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "number", required: true },
    {
      key: "deletedByUserId",
      label: "Deleted by user ID",
      type: "number",
      advanced: true,
      hint: "Defaults to the account's super-administrator.",
    },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).post("deletegroup", {
      group_id: input.groupId,
      deleted_by_user_id: input.deletedByUserId,
    });
  },
};

export default groupDelete;
