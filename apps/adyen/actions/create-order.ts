import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, type BodySpec, buildBody } from "../lib/client.ts";
import {
  additionalFieldsParam,
  currencyParam,
  merchantAccountParam,
  referenceParam,
  valueParam,
} from "../lib/params.ts";

/**
 * `POST /orders`.
 *
 * See the Checkout API v72 reference.
 */
interface Input {
  merchantAccount?: string;
  reference: string;
  currency: string;
  value: number;
  expiresAt?: string;
  additionalFields?: unknown;
}

const createOrderSpec: BodySpec = { fields: ["reference", "expiresAt"], amount: true };

const createOrder: ActionDefinition<Input> = {
  key: "create-order",
  type: "perform",
  resource: "order",
  title: "Create Order",
  description:
    "Create an order for partial payments (for example a gift card plus a card). Returns the orderData to pay against.",
  idempotent: false,
  params: [
    merchantAccountParam,
    referenceParam("Reference", true),
    currencyParam,
    valueParam,
    {
      key: "expiresAt",
      label: "Expires at",
      type: "string",
      hint: "ISO 8601. Defaults to 24 hours.",
    },
    additionalFieldsParam,
  ],
  output: [
    { key: "pspReference", type: "string", label: "PSP reference" },
    { key: "orderData", type: "string", label: "Order data" },
    { key: "expiresAt", type: "string", label: "Expires at" },
    { key: "remainingAmount", type: "object", label: "Remaining amount" },
    { key: "amount", type: "object", label: "Amount" },
    { key: "resultCode", type: "string", label: "Result code" },
    { key: "reference", type: "string", label: "Reference" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, createOrderSpec);
    return new AdyenClient(ctx).post("/orders", body);
  },
};

export default createOrder;
