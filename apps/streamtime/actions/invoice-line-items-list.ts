import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /invoices/{invoice_id}/invoice_line_items` — an invoice's line items.
 *
 * `quantity` is a string here too (see `quote-line-items-list`). `taxName` and
 * `externalTaxRateId` describe the tax treatment, and `accountCode` is the
 * accounting-system code the line posts to.
 */
interface Input {
  invoiceId: number;
}

const invoiceLineItemsList: ActionDefinition<Input> = {
  key: "invoice-line-items-list",
  type: "search",
  resource: "invoice",
  title: "List Invoice Line Items",
  description: "List the line items on an invoice.",
  params: [idParam("invoiceId", "Invoice ID")],
  output: [{ key: "invoiceLineItems", type: "array", label: "Invoice line items" }],

  async execute(input, ctx) {
    const invoiceLineItems = await new StreamtimeClient(ctx).request<unknown[]>(
      `/invoices/${encodeId(input.invoiceId)}/invoice_line_items`,
    );
    return { invoiceLineItems: invoiceLineItems ?? [] };
  },
};

export default invoiceLineItemsList;
