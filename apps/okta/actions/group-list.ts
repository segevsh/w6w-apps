import type { ActionDefinition } from "@w6w/types";
import { OktaClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  q?: string;
  limit?: number;
  after?: string;
}

const groupList: ActionDefinition<Input> = {
  key: "group-list",
  type: "search",
  resource: "group",
  title: "List Groups",
  description: "List groups in the org, optionally filtered by name.",
  params: [
    {
      key: "q",
      label: "Search",
      type: "string",
      placeholder: "Engineering",
      hint: "Matches against the start of the group name.",
    },
    ...pagination,
  ],
  output: [{ key: "groups", type: "array", label: "Groups" }],

  execute(input, ctx) {
    return new OktaClient(ctx).request("/groups", {
      query: { q: unset(input.q), limit: input.limit, after: unset(input.after) },
    });
  },
};

export default groupList;
