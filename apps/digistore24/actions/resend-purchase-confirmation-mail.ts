import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  purchase_id: string;
}

const resendPurchaseConfirmationMail: ActionDefinition<Input> = {
  key: "resend-purchase-confirmation-mail",
  type: "perform",
  resource: "purchase",
  title: "Resend Purchase Confirmation Mail",
  description: "Send the purchase confirmation email to the buyer again.",
  idempotent: false,
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
    { key: "modified", type: "string", label: "Y if the mail was sent" },
    { key: "note", type: "string", label: "Outcome note" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "resendPurchaseConfirmationMail",
      compact({ purchase_id: input.purchase_id }),
      { write: true },
    );
  },
};

export default resendPurchaseConfirmationMail;
