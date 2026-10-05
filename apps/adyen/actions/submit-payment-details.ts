import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, type BodySpec, buildBody } from "../lib/client.ts";
import { additionalFieldsParam } from "../lib/params.ts";

/**
 * `POST /payments/details`. The request has no `merchantAccount`; `details` is required.
 *
 * See the Checkout API v72 reference.
 */
interface Input {
  details: unknown;
  paymentData?: string;
  additionalFields?: unknown;
}

const submitPaymentDetailsSpec: BodySpec = {
  fields: ["paymentData"],
  json: ["details"],
  merchant: false,
};

const submitPaymentDetails: ActionDefinition<Input> = {
  key: "submit-payment-details",
  type: "perform",
  resource: "payment",
  title: "Submit Payment Details",
  description:
    "Complete a payment that needed more from the shopper: a redirect result, a 3D Secure result or a challenge.",
  idempotent: false,
  params: [
    {
      key: "details",
      label: "Details",
      type: "json",
      required: true,
      hint:
        'The details the client collected, for example {"redirectResult":"..."} or {"threeDSResult":"..."}.',
    },
    {
      key: "paymentData",
      label: "Payment data",
      type: "string",
      hint: "The paymentData from the action of the previous response.",
    },
    additionalFieldsParam,
  ],
  output: [
    { key: "resultCode", type: "string", label: "Result code" },
    { key: "pspReference", type: "string", label: "PSP reference" },
    { key: "merchantReference", type: "string", label: "Merchant reference" },
    { key: "refusalReason", type: "string", label: "Refusal reason" },
    { key: "action", type: "object", label: "Next action" },
    { key: "additionalData", type: "object", label: "Additional data" },
    { key: "amount", type: "object", label: "Amount" },
    { key: "donationToken", type: "string", label: "Donation token" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, submitPaymentDetailsSpec);
    return new AdyenClient(ctx).post("/payments/details", body);
  },
};

export default submitPaymentDetails;
