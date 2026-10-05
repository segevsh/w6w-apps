import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, encodeId } from "../lib/client.ts";
import {} from "../lib/params.ts";

/**
 * `PATCH /paymentLinks/{linkId}` accepts exactly one change: `status` = `expired`. Doing it again
 *
 * leaves the link expired, so it is idempotent.
 */
interface Input {
  linkId: string;
}

const expirePaymentLink: ActionDefinition<Input> = {
  key: "expire-payment-link",
  type: "perform",
  resource: "payment-link",
  title: "Expire Payment Link",
  description: "Expire a payment link so the shopper can no longer pay it.",
  idempotent: true,
  params: [
    { key: "linkId", label: "Link ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Link ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "expiresAt", type: "string", label: "Expires at" },
  ],

  execute(input, ctx) {
    return new AdyenClient(ctx).patch(`/paymentLinks/${encodeId(input.linkId)}`, {
      status: "expired",
    });
  },
};

export default expirePaymentLink;
