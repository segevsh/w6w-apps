import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, page } from "../lib/client.ts";

interface Input {
  query?: string;
  search?: string;
  limit?: number;
  next?: string;
  tz?: string;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List Tasks",
  description:
    "List Mixmax tasks visible to the token owner, filtered with a task query such as `type:email status:open`.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      hint:
        "Filter/sort expression, e.g. `type:email assignee:Myself status:open sortBy:due sortDir:asc`.",
    },
    {
      key: "search",
      label: "Saved search",
      type: "string",
      hint: "Saved-search context; use `all` with a custom query.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Maximum records per page (Mixmax paginates with `limit`/`next`).",
    },
    {
      key: "next",
      label: "Next cursor",
      type: "string",
      hint: "Opaque `next` cursor from a previous response.",
    },
    {
      key: "tz",
      label: "Time zone",
      type: "string",
      hint: "IANA time zone used to evaluate due dates.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Results" },
    { key: "next", type: "string", label: "Next cursor" },
    { key: "hasNext", type: "boolean", label: "More results available" },
  ],

  async execute(input, ctx) {
    const r = await new MixmaxClient(ctx).request("GET", "/tasks", {
      query: {
        query: input.query,
        search: input.search,
        limit: input.limit,
        next: input.next,
        tz: input.tz,
      },
    });
    return page(r);
  },
};

export default taskList;
