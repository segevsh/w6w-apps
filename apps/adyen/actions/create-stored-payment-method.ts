import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, type BodySpec, buildBody } from "../lib/client.ts";
import {
  additionalFieldsParam,
  merchantAccountParam,
  recurringModelParam,
  shopperReferenceParam,
} from "../lib/params.ts";

/**
 * `POST /storedPaymentMethods` returns HTTP 201 with the new `StoredPaymentMethodResource`.
 *
 * See the Checkout API v72 reference.
 */
interface Input {
  merchantAccount?: string;
  shopperReference: string;
  recurringProcessingModel: string;
  paymentMethod: unknown;
  shopperEmail?: string;
  shopperIP?: string;
  additionalFields?: unknown;
}

const createStoredPaymentMethodSpec: BodySpec = {
  fields: ["shopperReference", "recurringProcessingModel", "shopperEmail", "shopperIP"],
  json: ["paymentMethod"],
};

const createStoredPaymentMethod: ActionDefinition<Input> = {
  key: "create-stored-payment-method",
  type: "perform",
  resource: "stored-payment-method",
  title: "Create Stored Payment Method",
  description: "Create a token for a shopper's payment details so they can be charged again later.",
  idempotent: false,
  params: [
    merchantAccountParam,
    shopperReferenceParam(true),
    { ...recurringModelParam, required: true },
    {
      key: "paymentMethod",
      label: "Payment method",
      type: "json",
      required: true,
      hint: 'The details to store, for example {"type":"scheme","encryptedCardNumber":"..."}.',
    },
    { key: "shopperEmail", label: "Shopper email", type: "string" },
    { key: "shopperIP", label: "Shopper IP", type: "string" },
    additionalFieldsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Stored payment method ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "brand", type: "string", label: "Brand" },
    { key: "lastFour", type: "string", label: "Last four digits" },
    { key: "shopperReference", type: "string", label: "Shopper reference" },
    { key: "expiryMonth", type: "string", label: "Expiry month" },
    { key: "expiryYear", type: "string", label: "Expiry year" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, createStoredPaymentMethodSpec);
    return new AdyenClient(ctx).post("/storedPaymentMethods", body);
  },
};

export default createStoredPaymentMethod;
