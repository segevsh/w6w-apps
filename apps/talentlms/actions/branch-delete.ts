import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  branchId: number;
  deletedByUserId?: number;
}

const branchDelete: ActionDefinition<Input> = {
  key: "branch-delete",
  type: "perform",
  resource: "branch",
  title: "Delete Branch",
  description: "Delete a branch.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "branchId", label: "Branch ID", type: "number", required: true },
    {
      key: "deletedByUserId",
      label: "Deleted by user ID",
      type: "number",
      advanced: true,
      hint: "Defaults to the account's super-administrator.",
    },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).post("deletebranch", {
      branch_id: input.branchId,
      deleted_by_user_id: input.deletedByUserId,
    });
  },
};

export default branchDelete;
