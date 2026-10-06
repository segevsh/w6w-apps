import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  branchId: number;
}

const branchGet: ActionDefinition<Input> = {
  key: "branch-get",
  type: "read",
  resource: "branch",
  title: "Get Branch",
  description: "Fetch one branch with its users and courses.",
  params: [
    { key: "branchId", label: "Branch ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("branches", {
      id: input.branchId,
    });
  },
};

export default branchGet;
