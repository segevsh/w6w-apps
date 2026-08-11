import type { ActionDefinition } from "@w6w/types";
import { encodeId, HousecallClient } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/**
 * `GET /api/invoices/{uuid}` — one invoice with its items, taxes, discounts and
 * payments.
 *
 * The `/api` prefix is real and is not a base-path mistake: Find Invoices is
 * `/invoices` while this single read is `/api/invoices/{uuid}`. Four operations
 * in the reference are spelled that way and the rest are not.
 *
 * `invoiced_amount` on a line item (added 2026-06-15) is the portion of that
 * line allocated to *this* invoice — it differs from `amount` only where a job's
 * total was split across progress invoices, and may be null before the
 * allocation is computed.
 */
interface Input {
  invoiceId: string;
  companyId?: string;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description:
    "Fetch one invoice by uuid, with its line items, taxes, discounts and payments. Amounts are " +
    "integers in cents.",
  params: [
    { key: "invoiceId", label: "Invoice UUID", type: "string", required: true },
    companyIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "invoice_number", type: "string", label: "Invoice number" },
    { key: "amount", type: "number", label: "Amount (cents)" },
    { key: "due_amount", type: "number", label: "Due amount (cents)" },
    { key: "items", type: "array", label: "Line items" },
    { key: "payments", type: "array", label: "Payments" },
    { key: "job_id", type: "string", label: "Job ID" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json(`/api/invoices/${encodeId(input.invoiceId)}`, {
      companyId: input.companyId,
    });
  },
};

export default invoiceGet;
