import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, type BodySpec, buildBody, encodeId } from "../lib/client.ts";
import {
  additionalFieldsParam,
  merchantAccountParam,
  pspReferenceParam,
  referenceParam,
} from "../lib/params.ts";

/**
 * `POST /payments/{paymentPspReference}/cancels` returns HTTP 201 `status: received`; asynchronous.
 *
 * Use cancel-payment-by-reference when only your own reference is known.
 */
interface Input {
  merchantAccount?: string;
  paymentPspReference: string;
  reference?: string;
  additionalFields?: unknown;
}

const cancelPaymentSpec: BodySpec = { fields: ["reference"] };

const cancelPayment: ActionDefinition<Input> = {
  key: "cancel-payment",
  type: "perform",
  resource: "modification",
  title: "Cancel Payment",
  description:
    "Cancel an authorised payment that has not been captured yet. Needs the payment's PSP reference.",
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
    const body = buildBody(ctx, input, cancelPaymentSpec);
    return new AdyenClient(ctx).post(
      `/payments/${encodeId(input.paymentPspReference)}/cancels`,
      body,
    );
  },
};

export default cancelPayment;
