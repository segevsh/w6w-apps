import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  purchase_id: string;
}

const startRebilling: ActionDefinition<Input> = {
  key: "start-rebilling",
  type: "perform",
  resource: "purchase",
  title: "Start Rebilling",
  description: "Resume the payments of a purchase whose rebilling was stopped.",
  idempotent: true,
  params: [
    {
      key: "purchase_id",
      label: "Purchase ID",
      type: "string",
      required: true,
      hint: "The Digistore24 order ID, e.g. X26QE8GN.",
    },
  ],
  output: [
    { key: "modified", type: "string", label: "Y if rebilling changed" },
    { key: "billing_status", type: "string", label: "Current billing status" },
    { key: "next_payment_at", type: "string", label: "Next payment date" },
    { key: "rebilling_start_url", type: "string", label: "URL for the buyer to restart payments" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call("startRebilling", compact({ purchase_id: input.purchase_id }), {
      write: true,
    });
  },
};

export default startRebilling;
