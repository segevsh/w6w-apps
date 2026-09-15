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
}

/** `GET /coupons` — list the site's coupons. */
const listCoupons: ActionDefinition<Input> = {
  key: "list-coupons",
  type: "search",
  resource: "coupon",
  title: "List Coupons",
  description: "List a site's coupons.",
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
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(input.next ?? "/coupons", {
      query: input.next ? undefined : {
        limit: input.limit,
        order: input.order,
        ids: input.ids,
        sort: input.sort,
        begin_time: input.beginTime,
        end_time: input.endTime,
      },
    });
  },
};

export default listCoupons;
