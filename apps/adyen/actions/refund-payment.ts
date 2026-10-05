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
 * `POST /payments/{paymentPspReference}/refunds` returns HTTP 201 `status: received`; asynchronous.
 *
 * Some payment methods do not support partial refunds. If it is unclear whether the payment was
 * captured, use reverse-payment.
 */
interface Input {
  merchantAccount?: string;
  paymentPspReference: string;
  currency: string;
  value: number;
  reference?: string;
  merchantRefundReason?: string;
  capturePspReference?: string;
  additionalFields?: unknown;
}

const refundPaymentSpec: BodySpec = {
  fields: ["reference", "merchantRefundReason", "capturePspReference"],
  amount: true,
};

const refundPayment: ActionDefinition<Input> = {
  key: "refund-payment",
  type: "perform",
  resource: "modification",
  title: "Refund Payment",
  description:
    "Refund a captured payment, in full or in part. The outcome arrives later in a REFUND webhook.",
  idempotent: false,
  params: [
    merchantAccountParam,
    pspReferenceParam,
    currencyParam,
    valueParam,
    referenceParam("Reference", false),
    {
      key: "merchantRefundReason",
      label: "Refund reason",
      type: "select",
      options: [
        { value: "FRAUD", label: "FRAUD" },
        { value: "CUSTOMER REQUEST", label: "CUSTOMER REQUEST" },
        { value: "RETURN", label: "RETURN" },
        { value: "DUPLICATE", label: "DUPLICATE" },
        { value: "OTHER", label: "OTHER" },
      ],
    },
    {
      key: "capturePspReference",
      label: "Capture PSP reference",
      type: "string",
      hint: "PayPal only: the capture to refund.",
    },
    additionalFieldsParam,
  ],
  output: [
    { key: "pspReference", type: "string", label: "PSP reference of this request" },
    { key: "paymentPspReference", type: "string", label: "PSP reference of the payment" },
    { key: "status", type: "string", label: "Status (received)" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "merchantAccount", type: "string", label: "Merchant account" },
    { key: "amount", type: "object", label: "Amount" },
    { key: "capturePspReference", type: "string", label: "Capture PSP reference" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, refundPaymentSpec);
    return new AdyenClient(ctx).post(
      `/payments/${encodeId(input.paymentPspReference)}/refunds`,
      body,
    );
  },
};

export default refundPayment;
