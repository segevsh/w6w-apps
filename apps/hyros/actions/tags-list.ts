import type { ActionDefinition } from "@w6w/types";
import { HyrosClient } from "../lib/client.ts";

const tagsList: ActionDefinition<Record<string, never>> = {
  key: "tags-list",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description: "List every tag created on the account. This endpoint is not paginated.",
  params: [],
  output: [{ key: "result", type: "array", label: "Tag names" }],

  async execute(_input, ctx) {
    const { result } = await new HyrosClient(ctx).read("/tags");
    return { result };
  },
};

export default tagsList;
