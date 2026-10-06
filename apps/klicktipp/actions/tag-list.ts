import type { ActionDefinition } from "@w6w/types";
import { kt } from "../lib/client.ts";

type Input = Record<string, never>;

/** List the ID and name of every manual tag. Smart tags are not listed. */
const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description: "List the ID and name of every manual tag. Smart tags are not listed.",
  params: [],
  output: [{ key: "tags", type: "array", label: "Tags: { id, name }" }],

  async execute(_input, ctx) {
    ctx.log("info", "tag-list");
    const map = await kt(ctx, "GET", "/tag") as Record<string, string>;
    return { tags: Object.entries(map).map(([id, name]) => ({ id, name })) };
  },
};

export default tagList;
