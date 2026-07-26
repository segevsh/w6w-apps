import type { ActionDefinition } from "@w6w/types";
import { StripeClient } from "../lib/client.ts";

interface Input {
  invoiceId: string;
  autoAdvance?: boolean;
}

/**
 * Finalising freezes the invoice's line items and issues its number — after
 * this it can no longer be edited, only voided or paid.
 */
const invoiceFinalize: ActionDefinition<Input> = {
  key: "invoice-finalize",
  type: "perform",
  resource: "invoice",
  title: "Finalize Invoice",
  description:
    "Move a draft invoice to open. This freezes its line items and issues its number — it cannot be edited afterwards.",
  idempotent: true,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true, placeholder: "in_…" },
    {
      key: "autoAdvance",
      label: "Auto-advance",
      type: "boolean",
      hint: "Let Stripe run its dunning schedule against the finalised invoice.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "number", type: "string", label: "Invoice number" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request(
      `/invoices/${encodeURIComponent(input.invoiceId)}/finalize`,
      { form: { auto_advance: input.autoAdvance } },
    );
  },
};

export default invoiceFinalize;
