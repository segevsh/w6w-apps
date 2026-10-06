import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

type Input = Record<string, unknown>;

const teamMembersList: ActionDefinition<Input> = {
  key: "team-members-list",
  type: "read",
  resource: "account",
  title: "List Team Members",
  description: "List the members of your Cloze team (name and e-mail).",
  params: [],
  output: [
    { key: "list", type: "array", label: "Items" },
    { key: "count", type: "number", label: "Items returned" },
  ],

  async execute(_input, ctx) {
    const res = await call(ctx, "GET", "/v1/team/members/list");
    return {
      list: (res.list as unknown[] | undefined) ?? [],
      count: ((res.list as unknown[] | undefined) ?? []).length,
    };
  },
};

export default teamMembersList;
