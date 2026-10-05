import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, buildBody } from "../lib/client.ts";
import { additionalFieldsParam, merchantAccountParam } from "../lib/params.ts";

/**
 * `POST /orders/cancel` takes the order as `{orderData, pspReference}`.
 *
 * See the Checkout API v72 reference.
 */
interface Input {
  merchantAccount?: string;
  orderData: string;
  orderPspReference: string;
  additionalFields?: unknown;
}

const cancelOrder: ActionDefinition<Input> = {
  key: "cancel-order",
  type: "perform",
  resource: "order",
  title: "Cancel Order",
  description: "Cancel a partial-payment order and release what was authorised against it.",
  idempotent: false,
  params: [
    merchantAccountParam,
    {
      key: "orderData",
      label: "Order data",
      type: "string",
      required: true,
      hint: "The orderData returned by create-order.",
    },
    {
      key: "orderPspReference",
      label: "Order PSP reference",
      type: "string",
      required: true,
      hint: "The pspReference returned by create-order.",
    },
    additionalFieldsParam,
  ],
  output: [
    { key: "pspReference", type: "string", label: "PSP reference" },
    { key: "resultCode", type: "string", label: "Result code (Received)" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, {});
    return new AdyenClient(ctx).post("/orders/cancel", {
      ...body,
      order: { orderData: input.orderData, pspReference: input.orderPspReference },
    });
  },
};

export default cancelOrder;
