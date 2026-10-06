import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, encodeId } from "../lib/client.ts";

/**
 * `GET /api/v2/invoices/{invoiceId}` — Get one invoice by id.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  invoiceId: number;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Get one invoice by id.",
  params: [
    {
      key: "invoiceId",
      label: "Invoice ID",
      type: "number",
      required: true,
      hint: "Numeric Axonaut id of the invoice.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "number", type: "string", label: "Invoice number" },
    { key: "date", type: "string", label: "Date" },
    { key: "due_date", type: "string", label: "Due date" },
    { key: "total", type: "number", label: "Total" },
    { key: "paid_date", type: "string", label: "Paid date" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).one(`/invoices/${encodeId(input.invoiceId)}`);
  },
};

export default invoiceGet;
