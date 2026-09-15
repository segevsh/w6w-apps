import type { ActionDefinition } from "@w6w/types";
import { PAGE_OUTPUT, PAGE_PARAMS, RecurlyClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  order?: "asc" | "desc";
  ids?: string;
  next?: string;
  sort?: "created_at" | "updated_at";
  beginTime?: string;
  endTime?: string;
  state?: "active" | "inactive";
}

/** `GET /plans` — list the site's plans (the product catalog). */
const listPlans: ActionDefinition<Input> = {
  key: "list-plans",
  type: "search",
  resource: "plan",
  title: "List Plans",
  description: "List a site's plans.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [
        { value: "created_at", label: "Created at" },
        { value: "updated_at", label: "Updated at" },
      ],
    },
    { key: "beginTime", label: "Begin time", type: "datetime" },
    { key: "endTime", label: "End time", type: "datetime" },
    {
      key: "state",
      label: "State",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(input.next ?? "/plans", {
      query: input.next ? undefined : {
        limit: input.limit,
        order: input.order,
        ids: input.ids,
        sort: input.sort,
        begin_time: input.beginTime,
        end_time: input.endTime,
        state: input.state,
      },
    });
  },
};

export default listPlans;
