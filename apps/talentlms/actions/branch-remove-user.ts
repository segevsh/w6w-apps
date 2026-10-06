import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  userId: number;
  branchId: number;
}

const branchRemoveUser: ActionDefinition<Input> = {
  key: "branch-remove-user",
  type: "perform",
  resource: "branch",
  title: "Remove User from Branch",
  description: "Remove a user from a branch.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    { key: "branchId", label: "Branch ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("removeuserfrombranch", {
      user_id: input.userId,
      branch_id: input.branchId,
    });
  },
};

export default branchRemoveUser;
