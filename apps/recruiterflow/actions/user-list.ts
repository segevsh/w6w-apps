import type { ActionDefinition } from "@w6w/types";
import { asList, call, compact, flag, type QueryValue } from "../lib/client.ts";

interface Input {
  includeCount?: unknown;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  title: "List Users",
  description: "List the account's Recruiterflow users (recruiters).",
  params: [
    { key: "includeCount", label: "Include total count", type: "boolean" },
  ],
  output: [{ key: "items", type: "array", label: "Records" }, {
    key: "total",
    type: "number",
    label: "Total (with include_count)",
  }],

  async execute(input, ctx) {
    const query = compact({ "include_count": flag(input.includeCount) }) as Record<
      string,
      QueryValue
    >;
    const res = await call(ctx, "/user/list", { query });
    return asList(res);
  },
};

export default userList;
