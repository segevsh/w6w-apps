import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  branchId: number;
  status: string;
}

const branchSetStatus: ActionDefinition<Input> = {
  key: "branch-set-status",
  type: "perform",
  resource: "branch",
  title: "Set Branch Status",
  description: "Activate or deactivate a branch.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "branchId", label: "Branch ID", type: "number", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }],
    },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("branchsetstatus", {
      branch_id: input.branchId,
      status: input.status,
    });
  },
};

export default branchSetStatus;
