import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, type BodySpec, buildBody, encodeId } from "../lib/client.ts";
import {
  additionalFieldsParam,
  merchantAccountParam,
  pspReferenceParam,
  referenceParam,
} from "../lib/params.ts";

/**
 * `POST /payments/{paymentPspReference}/reversals` returns HTTP 201 `status: received`; asynchronous.
 *
 * Full amount only — Adyen decides between a cancel and a refund.
 */
interface Input {
  merchantAccount?: string;
  paymentPspReference: string;
  reference?: string;
  additionalFields?: unknown;
}

const reversePaymentSpec: BodySpec = { fields: ["reference"] };

const reversePayment: ActionDefinition<Input> = {
  key: "reverse-payment",
  type: "perform",
  resource: "modification",
  title: "Reverse Payment",
  description:
    "Cancel a payment if it has not been captured, or refund it in full if it has. Use when you are not sure which.",
  idempotent: false,
  params: [
    merchantAccountParam,
    pspReferenceParam,
    referenceParam("Reference", false),
    additionalFieldsParam,
  ],
  output: [
    { key: "pspReference", type: "string", label: "PSP reference of this request" },
    { key: "paymentPspReference", type: "string", label: "PSP reference of the payment" },
    { key: "status", type: "string", label: "Status (received)" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "merchantAccount", type: "string", label: "Merchant account" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, reversePaymentSpec);
    return new AdyenClient(ctx).post(
      `/payments/${encodeId(input.paymentPspReference)}/reversals`,
      body,
    );
  },
};

export default reversePayment;
