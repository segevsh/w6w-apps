import type { ActionDefinition } from "@w6w/types";
import { call, pick } from "../lib/client.ts";
import { int, select } from "../lib/params.ts";

type Input = Record<string, unknown>;

const tagsList: ActionDefinition<Input> = {
  key: "tags-list",
  type: "read",
  resource: "account",
  title: "List Tags",
  description: "List the tags in use, with how many records carry each.",
  params: [
    select("type", "Record type", ["person", "company", "project"]),
    int("limit", "Limit", { hint: "Maximum tags to return." }),
  ],
  output: [
    { key: "list", type: "array", label: "Items" },
    { key: "count", type: "number", label: "Items returned" },
  ],

  async execute(input, ctx) {
    const res = await call(ctx, "GET", "/v1/user/keywords", {
      query: pick(input, ["type", "limit"]),
    });
    return {
      list: (res.keywords as unknown[] | undefined) ?? [],
      count: ((res.keywords as unknown[] | undefined) ?? []).length,
    };
  },
};

export default tagsList;
