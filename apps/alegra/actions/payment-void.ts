import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, idPath } from "../lib/client.ts";

interface Input {
  id: string;
}

const paymentVoid: ActionDefinition<Input> = {
  key: "payment-void",
  type: "perform",
  resource: "payment",
  title: "Void Payment",
  description:
    "Void (anular) a payment. The record stays but no longer affects accounting or reports.",
  idempotent: false,
  params: [{ key: "id", label: "Payment ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Payment ID" }],

  async execute(input, ctx) {
    const client = new AlegraClient(ctx);
    return await client.request(`/payments/${idPath(input.id)}/void`, { method: "POST" });
  },
};

export default paymentVoid;
