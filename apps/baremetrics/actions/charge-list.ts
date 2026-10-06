import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `GET /v1/{source_id}/charges` — List charges in a source, optionally by time range, customer or subscription. */
interface Input {
  source_id: string;
  start?: number;
  end?: number;
  customer_oid?: string;
  subscription_oid?: string;
  per_page?: number;
  page?: number;
}

const chargeList: ActionDefinition<Input> = {
  key: "charge-list",
  type: "search",
  resource: "charge",
  title: "List Charges",
  description: "List charges in a source, optionally by time range, customer or subscription.",
  params: [
    {
      key: "source_id",
      label: "Source ID",
      type: "string",
      required: true,
      hint:
        "Id from List Sources. You can read data from any source, but only modify data that was added through the API (the Baremetrics source).",
    },
    { key: "start", label: "Start (unix timestamp)", type: "number" },
    { key: "end", label: "End (unix timestamp)", type: "number" },
    { key: "customer_oid", label: "Customer OID", type: "string" },
    { key: "subscription_oid", label: "Subscription OID", type: "string" },
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
    { key: "charges", type: "array", label: "Charges" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request("GET", `/${encodeId(input.source_id)}/charges`, {
      query: {
        start: input.start,
        end: input.end,
        customer_oid: input.customer_oid,
        subscription_oid: input.subscription_oid,
        per_page: input.per_page,
        page: input.page,
      },
    });
  },
};

export default chargeList;
