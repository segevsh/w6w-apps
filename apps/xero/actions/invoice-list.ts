import type { ActionDefinition } from "@w6w/types";
import { unset, XeroClient } from "../lib/client.ts";
import { listFilters, page } from "../lib/params.ts";

interface Input {
  where?: string;
  order?: string;
  page?: number;
  statuses?: string;
}

const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "read",
  resource: "invoice",
  title: "List Invoices",
  description: "List sales (ACCREC) and purchase (ACCPAY) invoices.",
  params: [
    ...listFilters,
    {
      key: "statuses",
      label: "Statuses",
      type: "string",
      placeholder: "DRAFT,SUBMITTED,AUTHORISED",
      hint: "Comma-separated: DRAFT, SUBMITTED, DELETED, AUTHORISED, PAID, VOIDED.",
    },
    page,
  ],
  output: [{ key: "Invoices", type: "array", label: "Invoices" }],

  execute(input, ctx) {
    return new XeroClient(ctx).request("/Invoices", {
      query: {
        where: input.where,
        order: input.order,
        page: input.page ?? 1,
        Statuses: unset(input.statuses),
      },
    });
  },
};

export default invoiceList;
