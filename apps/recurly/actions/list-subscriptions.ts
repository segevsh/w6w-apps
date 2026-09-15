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
  state?: "active" | "canceled" | "expired" | "future" | "in_trial" | "live";
}

/**
 * `GET /subscriptions` — list the site's subscriptions.
 *
 * `state=live` is Recurly's own umbrella for "active, canceled, future, or in
 * trial" — not a literal subscription state — and `state=in_trial` filters by
 * a computed trial window rather than a stored field. Both are documented
 * exactly this way on the `state` query parameter.
 */
const listSubscriptions: ActionDefinition<Input> = {
  key: "list-subscriptions",
  type: "search",
  resource: "subscription",
  title: "List Subscriptions",
  description: "List a site's subscriptions, optionally filtered by state.",
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
        { value: "canceled", label: "Canceled" },
        { value: "expired", label: "Expired" },
        { value: "future", label: "Future" },
        { value: "in_trial", label: "In trial" },
        { value: "live", label: "Live (active, canceled, future or in trial)" },
      ],
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(input.next ?? "/subscriptions", {
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

export default listSubscriptions;
