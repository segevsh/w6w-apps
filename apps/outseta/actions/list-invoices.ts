import type { ActionDefinition } from "@w6w/types";
import {
  OutsetaClient,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  excludeInvoiceUid?: string;
}

/** `GET /api/v1/billing/invoices` — List invoices, optionally omitting one by Uid. */
const listInvoices: ActionDefinition<Input> = {
  key: "list-invoices",
  type: "search",
  resource: "billing",
  title: "List Invoices",
  description: "List invoices, optionally omitting one by Uid.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "excludeInvoiceUid",
      label: "Exclude invoice Uid",
      type: "string",
      hint: "An invoice to omit from the result.",
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/billing/invoices`, {
      method: "GET",
      query: { ...pageQuery(input), excludeInvoiceUid: input.excludeInvoiceUid },
    });
  },
};

export default listInvoices;
