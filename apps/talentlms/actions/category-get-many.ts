import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

const categoryGetMany: ActionDefinition<Record<string, never>> = {
  key: "category-get-many",
  type: "read",
  resource: "category",
  title: "Get Many Categories",
  description: "List every category.",
  params: [],

  execute(_input, ctx) {
    return new TalentLmsClient(ctx).get("categories");
  },
};

export default categoryGetMany;
