import type { ActionDefinition } from "@w6w/types";
import { listOf, numberOf, RingoverClient } from "../lib/client.ts";

// deno-lint-ignore no-empty-interface
interface Input {}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description: "List the team-wide call tags. Needs IVRs Read on the key.",
  params: [],
  output: [
    { key: "tags", type: "array", label: "Tags" },
    { key: "count", type: "number", label: "Tags returned" },
  ],

  async execute(_input, ctx) {
    const body = await new RingoverClient(ctx).request("GET", "/tags");
    return { tags: listOf(body, "list"), count: numberOf(body, "list_count") };
  },
};

export default tagList;
