import type { ActionDefinition } from "@w6w/types";
import { listOf, numberOf, RingoverClient } from "../lib/client.ts";
import { limitParam, offsetParam } from "../lib/params.ts";

interface Input {
  limitCount?: number;
  limitOffset?: number;
}

const blacklistList: ActionDefinition<Input> = {
  key: "blacklist-list",
  type: "read",
  resource: "blacklist",
  title: "List Blacklisted Numbers",
  description: "List the numbers on the team-wide blacklist. Needs Numbers Read on the key.",
  params: [
    limitParam(1000),
    offsetParam,
  ],
  output: [
    { key: "numbers", type: "array", label: "Blacklisted numbers" },
    { key: "count", type: "number", label: "Numbers in this page" },
    { key: "total", type: "number", label: "Total blacklisted" },
  ],

  async execute(input, ctx) {
    const body = await new RingoverClient(ctx).request("GET", "/blacklists/numbers", {
      query: { limit_count: input.limitCount, limit_offset: input.limitOffset },
    });
    return {
      numbers: listOf(body, "blacklist_list"),
      count: numberOf(body, "blacklist_list_count"),
      total: numberOf(body, "total_blacklist_count"),
    };
  },
};

export default blacklistList;
