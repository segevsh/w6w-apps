import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

type Input = Record<string, never>;

/** `POST /api/1/getLists/` */
const listGetAll: ActionDefinition<Input> = {
  key: "list-get-all",
  type: "read",
  title: "List Lists",
  description:
    "Return every subscriber list in the account, indexed by list ID (limit: 5 requests per second).",
  params: [],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(_input, ctx) {
    const result = await call(ctx, "getLists", {});
    return { result };
  },
};

export default listGetAll;
