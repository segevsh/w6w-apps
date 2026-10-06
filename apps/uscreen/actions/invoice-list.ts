import type { ActionDefinition } from "@w6w/types";
import { UscreenClient } from "../lib/client.ts";
import { DATE_FIELD, PAGE, rangeParams } from "../lib/params.ts";

interface Input {
  from?: string;
  to?: string;
  dateField?: string;
  page?: number;
}

const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description:
    "List invoices. Total-Count is capped at 10000+ here and the Link header carries no `last`.",
  params: [
    ...rangeParams(),
    DATE_FIELD,
    PAGE,
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "totalCount", type: "number", label: "Total-Count header (null when absent)" },
    {
      key: "totalCountCapped",
      type: "boolean",
      label: "True when the total was reported as 10000+",
    },
    { key: "page", type: "number", label: "Page returned" },
    { key: "nextPage", type: "number", label: "Next page number, or null on the last page" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  execute(input, ctx) {
    return new UscreenClient(ctx).list("/invoices", {
      "from": input.from,
      "to": input.to,
      "date_field": input.dateField,
      "page": input.page,
    });
  },
};

export default invoiceList;
