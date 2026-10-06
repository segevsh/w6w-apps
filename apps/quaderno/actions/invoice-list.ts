import type { ActionDefinition } from "@w6w/types";
import { QuadernoClient } from "../lib/client.ts";
import { listOutput, pagination } from "../lib/common.ts";

interface Input {
  q?: string;
  date?: string;
  state?: string;
  contactId?: number;
  limit?: number;
  createdBefore?: number;
}

const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description: "List invoices, newest first, with optional filters.",
  params: [
    {
      key: "q",
      label: "Search",
      type: "string",
      hint: "Matches number, customer name or PO number.",
    },
    {
      key: "date",
      label: "Issue date range",
      type: "string",
      hint: "`2019-01-01,2019-12-31` \u2014 a range is required.",
    },
    {
      key: "state",
      label: "State",
      type: "select",
      options: [
        { "value": "outstanding", "label": "outstanding" },
        { "value": "late", "label": "late" },
        { "value": "uncollectible", "label": "uncollectible" },
        { "value": "paid", "label": "paid" },
      ],
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      hint: "Only documents for this customer.",
    },
    ...pagination,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new QuadernoClient(ctx).list("/invoices", {
      q: input.q,
      date: input.date,
      state: input.state,
      contact: input.contactId,
      limit: input.limit,
      created_before: input.createdBefore,
    });
  },
};

export default invoiceList;
