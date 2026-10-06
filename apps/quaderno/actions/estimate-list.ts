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

const estimateList: ActionDefinition<Input> = {
  key: "estimate-list",
  type: "search",
  resource: "estimate",
  title: "List Estimates",
  description: "List estimates (Quaderno calls them proformas), newest first.",
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
        { "value": "accepted", "label": "accepted" },
        { "value": "declined", "label": "declined" },
        { "value": "invoiced", "label": "invoiced" },
        { "value": "late", "label": "late" },
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
    return new QuadernoClient(ctx).list("/proformas", {
      q: input.q,
      date: input.date,
      state: input.state,
      contact: input.contactId,
      limit: input.limit,
      created_before: input.createdBefore,
    });
  },
};

export default estimateList;
