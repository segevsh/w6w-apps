import type { ActionDefinition } from "@w6w/types";
import { IntercomClient } from "../lib/client.ts";

/**
 * GET /tags — list every tag defined on the workspace. Useful for resolving a
 * tag name to the `tag_id` other endpoints (e.g. List Companies) filter by.
 */
const tagGetMany: ActionDefinition<Record<string, never>> = {
  key: "tag-get-many",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List all tags defined on the workspace.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Tags" },
  ],

  execute(_input, ctx) {
    return new IntercomClient(ctx).request("/tags");
  },
};

export default tagGetMany;
