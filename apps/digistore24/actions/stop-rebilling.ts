import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  purchase_id: string;
  force?: boolean;
  ignore_refund_possibility?: boolean;
}

const stopRebilling: ActionDefinition<Input> = {
  key: "stop-rebilling",
  type: "perform",
  resource: "purchase",
  title: "Stop Rebilling",
  description: "Stop the recurring payments of a subscription or installment purchase.",
  idempotent: true,
  params: [
    {
      key: "purchase_id",
      label: "Purchase ID",
      type: "string",
      required: true,
      hint: "The Digistore24 order ID, e.g. X26QE8GN.",
    },
    {
      key: "force",
      label: "Force",
      type: "boolean",
      hint:
        "Cancel immediately even if a minimum duration applies (otherwise it ends with the minimum duration).",
    },
    {
      key: "ignore_refund_possibility",
      label: "Ignore refund possibility",
      type: "boolean",
      hint:
        "On = cancel at the end of the regular cancellation period instead of immediately when a refund would be possible. Ignored when Force is on.",
    },
  ],
  output: [
    { key: "modified", type: "string", label: "Y if rebilling changed" },
    {
      key: "code",
      type: "string",
      label: "stopped_now, stopped_later or stopped_manual_rebilling",
    },
    { key: "billing_status", type: "string", label: "Current billing status" },
    { key: "rebilling_active", type: "string", label: "Y if rebilling is still active" },
    { key: "next_payment_at", type: "string", label: "Next payment date" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "stopRebilling",
      compact({
        purchase_id: input.purchase_id,
        force: input.force,
        ignore_refund_possibility: input.ignore_refund_possibility,
      }),
      { write: true },
    );
  },
};

export default stopRebilling;
