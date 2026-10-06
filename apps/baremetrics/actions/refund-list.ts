import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `GET /v1/{source_id}/refunds` — List refunds in a source, optionally by time range. */
interface Input {
  source_id: string;
  start?: number;
  end?: number;
  per_page?: number;
  page?: number;
}

const refundList: ActionDefinition<Input> = {
  key: "refund-list",
  type: "search",
  resource: "refund",
  title: "List Refunds",
  description: "List refunds in a source, optionally by time range.",
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
    { key: "refunds", type: "array", label: "Refunds" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request("GET", `/${encodeId(input.source_id)}/refunds`, {
      query: { start: input.start, end: input.end, per_page: input.per_page, page: input.page },
    });
  },
};

export default refundList;
