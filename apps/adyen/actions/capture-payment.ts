import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, type BodySpec, buildBody, encodeId } from "../lib/client.ts";
import {
  additionalFieldsParam,
  currencyParam,
  merchantAccountParam,
  pspReferenceParam,
  referenceParam,
  valueParam,
} from "../lib/params.ts";

/**
 * `POST /payments/{paymentPspReference}/captures` returns HTTP 201 `status: received` — the capture
 *
 * itself is asynchronous and confirmed by a webhook.
 */
interface Input {
  merchantAccount?: string;
  paymentPspReference: string;
  currency: string;
  value: number;
  reference?: string;
  additionalFields?: unknown;
}

const capturePaymentSpec: BodySpec = { fields: ["reference"], amount: true };

const capturePayment: ActionDefinition<Input> = {
  key: "capture-payment",
  type: "perform",
  resource: "modification",
  title: "Capture Payment",
  description:
    "Capture an authorised payment, in full or in part. The outcome arrives later in a CAPTURE webhook.",
  idempotent: false,
  params: [
    merchantAccountParam,
    pspReferenceParam,
    currencyParam,
    valueParam,
    referenceParam("Reference", false),
    additionalFieldsParam,
  ],
  output: [
    { key: "pspReference", type: "string", label: "PSP reference of this request" },
    { key: "paymentPspReference", type: "string", label: "PSP reference of the payment" },
    { key: "status", type: "string", label: "Status (received)" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "merchantAccount", type: "string", label: "Merchant account" },
    { key: "amount", type: "object", label: "Amount" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, capturePaymentSpec);
    return new AdyenClient(ctx).post(
      `/payments/${encodeId(input.paymentPspReference)}/captures`,
      body,
    );
  },
};

export default capturePayment;
