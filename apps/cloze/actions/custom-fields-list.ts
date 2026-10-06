import type { ActionDefinition } from "@w6w/types";
import { call, pick } from "../lib/client.ts";
import { select } from "../lib/params.ts";

type Input = Record<string, unknown>;

const customFieldsList: ActionDefinition<Input> = {
  key: "custom-fields-list",
  type: "read",
  resource: "account",
  title: "List Custom Fields",
  description: "List the custom fields defined in your account, with their ids and allowed values.",
  params: [
    select("relationtype", "Record type", ["person", "project", "company"], {
      hint: "Leave empty for all.",
    }),
  ],
  output: [
    { key: "list", type: "array", label: "Items" },
    { key: "count", type: "number", label: "Items returned" },
  ],

  async execute(input, ctx) {
    const res = await call(ctx, "GET", "/v1/user/fields", { query: pick(input, ["relationtype"]) });
    return {
      list: (res.list as unknown[] | undefined) ?? [],
      count: ((res.list as unknown[] | undefined) ?? []).length,
    };
  },
};

export default customFieldsList;
