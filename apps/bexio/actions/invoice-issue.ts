import type { ActionDefinition } from "@w6w/types";
import { BexioClient } from "../lib/client.ts";

interface Input {
  invoiceId: number;
}

/**
 * A newly created invoice sits as a draft (`kb_item_status_id` "draft") until
 * issued — only an issued invoice gets its final `document_nr` and becomes
 * legally sendable. Issuing is irreversible on the free plan and reversible
 * via `revert_issue` only where the vendor's own business rules allow it, so
 * this is NOT marked `idempotent`: issuing twice is not the same as once.
 */
const invoiceIssue: ActionDefinition<Input> = {
  key: "invoice-issue",
  type: "perform",
  resource: "invoice",
  title: "Issue Invoice",
  description: "Issue a draft invoice, finalizing its document number.",
  idempotent: false,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "number", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).post(
      `/2.0/kb_invoice/${encodeURIComponent(input.invoiceId)}/issue`,
      {},
    );
  },
};

export default invoiceIssue;
