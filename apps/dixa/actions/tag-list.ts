import type { ActionDefinition } from "@w6w/types";
import { DixaClient } from "../lib/client.ts";

interface Input {
  includeDeactivated?: boolean;
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List the organisation's tags. Deactivated tags are hidden unless asked for.",
  params: [
    { key: "includeDeactivated", label: "Include deactivated", type: "boolean", default: false },
  ],
  output: [{ key: "data", type: "array", label: "Tags: { id, name, color, state }" }],

  execute(input, ctx) {
    return new DixaClient(ctx).json("/tags", {
      query: { includeDeactivated: input.includeDeactivated ? "true" : undefined },
    });
  },
};

export default tagList;
