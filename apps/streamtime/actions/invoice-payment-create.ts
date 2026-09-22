import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { dateParam, idParam } from "../lib/params.ts";

/**
 * `POST /invoices/{invoice_id}/invoice_payments` — record a payment or payout.
 *
 * ## Three fields the schema marks read-only are exposed here, and that is deliberate
 *
 * The `InvoicePayment` model marks `paymentDate`, `notes` and `amountPaidIncTax`
 * **read-only**, leaving `invoiceId` as the only writable property. A payment
 * request carrying nothing but an invoice id cannot say how much was paid or
 * when, so a strictly-writable reading of the schema makes this route unusable.
 * The three fields are in the document's own model; only their annotations are
 * questionable. They are all optional here — nothing is invented as required —
 * and the README records the deviation.
 *
 * The documented `paymentAccountId` query parameter is exposed as well; the spec
 * says it is "required for non-external invoices", so it is what decides whether
 * a payment goes through a bank account.
 */
interface Input {
  invoiceId: number;
  paymentAccountId?: string;
  amountPaidIncTax?: number;
  paymentDate?: string;
  notes?: string;
}

const invoicePaymentCreate: ActionDefinition<Input> = {
  key: "invoice-payment-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice Payment",
  description:
    "Record a payment or payout against an invoice, optionally routed through a payment account.",
  idempotent: false,
  params: [
    idParam("invoiceId", "Invoice ID", "The invoice being paid."),
    {
      key: "paymentAccountId",
      label: "Payment Account ID",
      type: "string",
      hint: "Streamtime's spec says this is required for non-external invoices.",
    },
    {
      key: "amountPaidIncTax",
      label: "Amount Paid (inc tax)",
      type: "number",
      hint: "Read-only in the schema, but a payment has to state an amount to be worth anything.",
    },
    dateParam(
      "paymentDate",
      "Payment Date",
      "Read-only in the schema; exposed for the same reason.",
    ),
    { key: "notes", label: "Notes", type: "text", hint: "Read-only in the schema." },
  ],
  output: [
    { key: "id", type: "number", label: "Payment ID" },
    { key: "invoiceId", type: "number", label: "Invoice ID" },
    { key: "paymentDate", type: "string", label: "Payment date" },
    { key: "amountPaidIncTax", type: "number", label: "Amount paid inc tax" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(
      `/invoices/${encodeId(input.invoiceId)}/invoice_payments`,
      {
        method: "POST",
        query: compact({ paymentAccountId: input.paymentAccountId }),
        body: compact({
          invoiceId: input.invoiceId,
          amountPaidIncTax: input.amountPaidIncTax,
          paymentDate: input.paymentDate,
          notes: input.notes,
        }),
      },
    );
  },
};

export default invoicePaymentCreate;
