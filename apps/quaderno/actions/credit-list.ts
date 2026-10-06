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

const creditList: ActionDefinition<Input> = {
  key: "credit-list",
  type: "search",
  resource: "credit",
  title: "List Credit Notes",
  description: "List credit notes, newest first.",
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
        { "value": "paid", "label": "paid" },
        { "value": "void", "label": "void" },
        { "value": "archived", "label": "archived" },
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
    return new QuadernoClient(ctx).list("/credits", {
      q: input.q,
      date: input.date,
      state: input.state,
      contact: input.contactId,
      limit: input.limit,
      created_before: input.createdBefore,
    });
  },
};

export default creditList;
