import type { ActionDefinition } from "@w6w/types";
import { MoonClerkClient, seg } from "../lib/client.ts";

interface Input {
  paymentId: number;
}

/** `GET /payments/:id` — one payment, wrapped as `{ "payment": {...} }`. */
const paymentGet: ActionDefinition<Input> = {
  key: "payment-get",
  type: "read",
  resource: "payment",
  title: "Get Payment",
  description:
    "Fetch one payment by ID, with amount, Stripe fee, refunded amount, Stripe references, coupon and custom-field answers.",
  params: [
    {
      key: "paymentId",
      label: "Payment ID",
      type: "number",
      required: true,
      hint: "From List Payments.",
      validation: { integer: true },
    },
  ],
  output: [{ key: "payment", type: "object", label: "Payment" }],

  async execute(input, ctx) {
    return {
      payment: await new MoonClerkClient(ctx).one(`/payments/${seg(input.paymentId)}`, "payment"),
    };
  },
};

export default paymentGet;
