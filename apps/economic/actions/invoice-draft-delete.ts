import type { ActionDefinition } from "@w6w/types";
import { EconomicClient, seg } from "../lib/client.ts";

const invoiceDraftDelete: ActionDefinition<{ draftInvoiceNumber: number }> = {
  key: "invoice-draft-delete",
  type: "perform",
  resource: "invoice",
  title: "Delete Draft Invoice",
  description: "Delete a draft invoice. Booked invoices cannot be deleted.",
  idempotent: false,
  params: [{
    key: "draftInvoiceNumber",
    label: "Draft invoice number",
    type: "number",
    required: true,
  }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],
  async execute(input, ctx) {
    await new EconomicClient(ctx).request(
      "DELETE",
      `/invoices/drafts/${seg(input.draftInvoiceNumber)}`,
    );
    return { deleted: true };
  },
};

export default invoiceDraftDelete;
