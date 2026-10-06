import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `GET /v1/{source_id}/subscriptions` — List subscriptions in a source, optionally for one customer. */
interface Input {
  source_id: string;
  customer_oid?: string;
  order?: string;
  per_page?: number;
  page?: number;
}

const subscriptionList: ActionDefinition<Input> = {
  key: "subscription-list",
  type: "search",
  resource: "subscription",
  title: "List Subscriptions",
  description: "List subscriptions in a source, optionally for one customer.",
  params: [
    {
      key: "source_id",
      label: "Source ID",
      type: "string",
      required: true,
      hint:
        "Id from List Sources. You can read data from any source, but only modify data that was added through the API (the Baremetrics source).",
    },
    { key: "customer_oid", label: "Customer OID", type: "string" },
    {
      key: "order",
      label: "Order",
      type: "select",
      hint: "Vendor default is desc.",
      options: [{ value: "desc", label: "Newest first" }, { value: "asc", label: "Oldest first" }],
    },
    {
      key: "per_page",
      label: "Per page",
      type: "number",
      hint: "Objects per page. Vendor default 30, maximum 200.",
      validation: { integer: true, min: 1, max: 200 },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Page number; the vendor's pagination meta starts at 0.",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "subscriptions", type: "array", label: "Subscriptions" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request(
      "GET",
      `/${encodeId(input.source_id)}/subscriptions`,
      {
        query: {
          customer_oid: input.customer_oid,
          order: input.order,
          per_page: input.per_page,
          page: input.page,
        },
      },
    );
  },
};

export default subscriptionList;
