import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

const branchGetMany: ActionDefinition<Record<string, never>> = {
  key: "branch-get-many",
  type: "read",
  resource: "branch",
  title: "Get Many Branches",
  description: "List every branch.",
  params: [],

  execute(_input, ctx) {
    return new TalentLmsClient(ctx).get("branches");
  },
};

export default branchGetMany;
