import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `GET /v1/{source_id}/customers/{oid}/events` — List the events recorded for one customer. */
interface Input {
  source_id: string;
  oid: string;
  per_page?: number;
  page?: number;
}

const customerEventsList: ActionDefinition<Input> = {
  key: "customer-events-list",
  type: "search",
  resource: "customer",
  title: "List Customer Events",
  description: "List the events recorded for one customer.",
  params: [
    {
      key: "source_id",
      label: "Source ID",
      type: "string",
      required: true,
      hint:
        "Id from List Sources. You can read data from any source, but only modify data that was added through the API (the Baremetrics source).",
    },
    { key: "oid", label: "Customer OID", type: "string", required: true },
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
    { key: "events", type: "array", label: "Events" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request(
      "GET",
      `/${encodeId(input.source_id)}/customers/${encodeId(input.oid)}/events`,
      {
        query: { per_page: input.per_page, page: input.page },
      },
    );
  },
};

export default customerEventsList;
