import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, compact, encodeId } from "../lib/client.ts";

/** `POST /billing/{agreementId}/credit` — Anchor operation `addCredit`. */
interface Input {
  agreementId: string;
  amount: string;
  serviceTemplateId: string;
  note?: string;
}

const creditAdd: ActionDefinition<Input> = {
  key: "credit-add",
  type: "perform",
  resource: "credit",
  title: "Add Credit",
  description:
    "Add a credit (negative charge) to a client's account under an agreement. It reduces the total due on future invoices.",
  idempotent: false,
  params: [
    { key: "agreementId", label: "Agreement ID", type: "string", required: true },
    {
      key: "amount",
      label: "Amount",
      type: "string",
      required: true,
      hint: 'Decimal amount as a string, e.g. "25.00".',
    },
    {
      key: "serviceTemplateId",
      label: "Service template ID",
      type: "string",
      required: true,
      hint: "The service the credit applies to; find ids with List Service Templates.",
    },
    { key: "note", label: "Note", type: "string" },
  ],
  output: [
    { key: "creditId", type: "string", label: "New credit ID" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("POST", `/billing/${encodeId(input.agreementId)}/credit`, {
      body: compact({
        amount: input.amount,
        serviceTemplateId: input.serviceTemplateId,
        note: input.note,
      }),
    });
  },
};

export default creditAdd;
