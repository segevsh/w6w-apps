import type { ActionDefinition } from "@w6w/types";
import { listOf, numberOf, RingoverClient } from "../lib/client.ts";
import { limitParam, offsetParam } from "../lib/params.ts";

interface Input {
  limitCount?: number;
  limitOffset?: number;
}

const groupList: ActionDefinition<Input> = {
  key: "group-list",
  type: "read",
  resource: "group",
  title: "List Groups",
  description:
    "List call (ring) groups. Without Monitoring on the key only the groups the key owner belongs to are returned.",
  params: [
    limitParam(1000),
    offsetParam,
  ],
  output: [
    { key: "groups", type: "array", label: "Groups" },
    { key: "count", type: "number", label: "Groups returned" },
  ],

  async execute(input, ctx) {
    const body = await new RingoverClient(ctx).request("GET", "/groups", {
      query: { limit_count: input.limitCount, limit_offset: input.limitOffset },
    });
    return { groups: listOf(body, "list"), count: numberOf(body, "list_count") };
  },
};

export default groupList;
