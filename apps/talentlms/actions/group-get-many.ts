import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

const groupGetMany: ActionDefinition<Record<string, never>> = {
  key: "group-get-many",
  type: "read",
  resource: "group",
  title: "Get Many Groups",
  description: "List every group.",
  params: [],

  execute(_input, ctx) {
    return new TalentLmsClient(ctx).get("groups");
  },
};

export default groupGetMany;
