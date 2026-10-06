import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

type Input = Record<string, unknown>;

const teamRolesList: ActionDefinition<Input> = {
  key: "team-roles-list",
  type: "read",
  resource: "account",
  title: "List Team Roles",
  description: "List the roles available on your Cloze team.",
  params: [],
  output: [
    { key: "list", type: "array", label: "Items" },
    { key: "count", type: "number", label: "Items returned" },
  ],

  async execute(_input, ctx) {
    const res = await call(ctx, "GET", "/v1/team/roles");
    return {
      list: (res.list as unknown[] | undefined) ?? [],
      count: ((res.list as unknown[] | undefined) ?? []).length,
    };
  },
};

export default teamRolesList;
