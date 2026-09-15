import type { ActionDefinition } from "@w6w/types";
import { MocoClient } from "../lib/client.ts";

interface Input {
  invoiceId: number;
  status: "created" | "sent" | "overdue" | "ignored";
}

/**
 * `PUT /invoices/{id}/update_status` — verified against `docs.mocoapp.com/api/docs/v1.yaml`.
 * Works for regular invoices only, not drafts; `status` is the one required field, restricted to
 * the four transitions MOCO's own enum documents (`created`, `sent`, `overdue`, `ignored` —
 * notably not `paid`, which MOCO derives from recorded payments rather than a direct transition).
 * Responds `204 No Content` on success.
 */
const invoiceUpdateStatus: ActionDefinition<Input> = {
  key: "invoice-update-status",
  type: "perform",
  resource: "invoice",
  title: "Update Invoice Status",
  description: "Transition an invoice's status (e.g. mark it sent).",
  idempotent: true,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "number", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "created", label: "Created" },
        { value: "sent", label: "Sent" },
        { value: "overdue", label: "Overdue" },
        { value: "ignored", label: "Ignored" },
      ],
    },
  ],
  output: [],

  async execute(input, ctx) {
    await new MocoClient(ctx).request(`/invoices/${input.invoiceId}/update_status`, {
      method: "PUT",
      body: { status: input.status },
    });
    return {};
  },
};

export default invoiceUpdateStatus;
