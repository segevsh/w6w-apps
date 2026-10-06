import type { ActionDefinition } from "@w6w/types";
import { PylonClient } from "../lib/client.ts";

/** `GET /tags` — documents no query parameters. */
const tagList: ActionDefinition<Record<string, never>> = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description: "List every tag, for issues, accounts and articles.",
  params: [],
  output: [
    { key: "tags", type: "array", label: "Tags (id, value, object_type, hex_color)" },
    { key: "hasNextPage", type: "boolean", label: "Whether Pylon reports more results" },
  ],

  async execute(_input, ctx) {
    const { items, hasNextPage } = await new PylonClient(ctx).list("GET", "/tags");
    return { tags: items, hasNextPage };
  },
};

export default tagList;
