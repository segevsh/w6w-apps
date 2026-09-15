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
  state?: "pending" | "processing" | "past_due" | "paid" | "failed" | "open" | "closed" | "voided";
  type?: "charge" | "credit" | "legacy" | "non-legacy";
}

/** `GET /invoices` — list the site's invoices. */
const listInvoices: ActionDefinition<Input> = {
  key: "list-invoices",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description: "List a site's invoices, optionally filtered by state or type.",
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
        { value: "pending", label: "Pending" },
        { value: "processing", label: "Processing" },
        { value: "past_due", label: "Past due" },
        { value: "paid", label: "Paid" },
        { value: "failed", label: "Failed" },
        { value: "open", label: "Open (pending, processing or past due)" },
        { value: "closed", label: "Closed (paid or failed)" },
        { value: "voided", label: "Voided" },
      ],
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "charge", label: "Charge invoices only" },
        { value: "credit", label: "Credit invoices only" },
        { value: "non-legacy", label: "Charge and credit invoices" },
        { value: "legacy", label: "Legacy invoices only" },
      ],
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(input.next ?? "/invoices", {
      query: input.next ? undefined : {
        limit: input.limit,
        order: input.order,
        ids: input.ids,
        sort: input.sort,
        begin_time: input.beginTime,
        end_time: input.endTime,
        state: input.state,
        type: input.type,
      },
    });
  },
};

export default listInvoices;
