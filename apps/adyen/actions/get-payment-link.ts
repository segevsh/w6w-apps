import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, encodeId } from "../lib/client.ts";
import {} from "../lib/params.ts";

/**
 * `GET /paymentLinks/{linkId}`.
 *
 * See the Checkout API v72 reference.
 */
interface Input {
  linkId: string;
}

const getPaymentLink: ActionDefinition<Input> = {
  key: "get-payment-link",
  type: "read",
  resource: "payment-link",
  title: "Get Payment Link",
  description: "Get a payment link and its current status (active, paid, expired, ...).",
  params: [
    {
      key: "linkId",
      label: "Link ID",
      type: "string",
      required: true,
      hint: "The id returned by create-payment-link.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Link ID" },
    { key: "url", type: "string", label: "Payment link URL" },
    {
      key: "status",
      type: "string",
      label: "Status (active, completed, expired, paid, paymentPending)",
    },
    { key: "expiresAt", type: "string", label: "Expires at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "amount", type: "object", label: "Amount" },
  ],

  execute(input, ctx) {
    return new AdyenClient(ctx).get(`/paymentLinks/${encodeId(input.linkId)}`, {});
  },
};

export default getPaymentLink;
