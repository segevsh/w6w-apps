import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

type Input = Record<string, unknown>;

const teamNodesList: ActionDefinition<Input> = {
  key: "team-nodes-list",
  type: "read",
  resource: "account",
  title: "List Team Hierarchy Nodes",
  description: "List the subteam nodes of your hierarchy.",
  params: [],
  output: [
    { key: "list", type: "array", label: "Items" },
    { key: "count", type: "number", label: "Items returned" },
  ],

  async execute(_input, ctx) {
    const res = await call(ctx, "GET", "/v1/team/nodes");
    return {
      list: (res.list as unknown[] | undefined) ?? [],
      count: ((res.list as unknown[] | undefined) ?? []).length,
    };
  },
};

export default teamNodesList;
