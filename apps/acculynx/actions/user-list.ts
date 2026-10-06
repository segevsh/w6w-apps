import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient } from "../lib/client.ts";
import { PAGED_OUTPUT, pageQuery, pagingParams } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  startIndex?: number;
  status?: string;
}

const action: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List company users with role and status.",
  params: [
    ...pagingParams(),
    {
      key: "status",
      label: "Status",
      type: "string",
      advanced: true,
      hint: "Filter by user status: Active, Inactive, Archived or Deleted.",
    },
  ],
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get("/users", {
      ...pageQuery(input, "pageStartIndex"),
      status: input.status,
    });
  },
};

export default action;
