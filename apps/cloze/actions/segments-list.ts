import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";
import { select } from "../lib/params.ts";

type Input = Record<string, unknown>;

const segmentsList: ActionDefinition<Input> = {
  key: "segments-list",
  type: "read",
  resource: "account",
  title: "List Segments",
  description: "List the segments configured for your people or your projects.",
  params: [select("type", "Record type", ["people", "projects"], { default: "people" })],
  output: [
    { key: "list", type: "array", label: "Items" },
    { key: "count", type: "number", label: "Items returned" },
  ],

  async execute(input, ctx) {
    const res = await call(
      ctx,
      "GET",
      `/v1/user/segments/${input.type === "projects" ? "projects" : "people"}`,
    );
    return {
      list: (res.list as unknown[] | undefined) ?? [],
      count: ((res.list as unknown[] | undefined) ?? []).length,
    };
  },
};

export default segmentsList;
