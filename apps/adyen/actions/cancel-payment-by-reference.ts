import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, type BodySpec, buildBody } from "../lib/client.ts";
import { additionalFieldsParam, merchantAccountParam, referenceParam } from "../lib/params.ts";

/**
 * `POST /cancels` (standalone cancel) returns HTTP 201 `status: received`; asynchronous.
 *
 * See the Checkout API v72 reference.
 */
interface Input {
  merchantAccount?: string;
  paymentReference: string;
  reference?: string;
  additionalFields?: unknown;
}

const cancelPaymentByReferenceSpec: BodySpec = { fields: ["paymentReference", "reference"] };

const cancelPaymentByReference: ActionDefinition<Input> = {
  key: "cancel-payment-by-reference",
  type: "perform",
  resource: "modification",
  title: "Cancel Payment by Reference",
  description:
    "Cancel an authorised payment using your own payment reference instead of its PSP reference.",
  idempotent: false,
  params: [
    merchantAccountParam,
    {
      key: "paymentReference",
      label: "Payment reference",
      type: "string",
      required: true,
      hint: "The reference you set on the payment when you created it.",
    },
    referenceParam("Reference", false),
    additionalFieldsParam,
  ],
  output: [
    { key: "pspReference", type: "string", label: "PSP reference of this request" },
    { key: "paymentReference", type: "string", label: "Payment reference" },
    { key: "status", type: "string", label: "Status (received)" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "merchantAccount", type: "string", label: "Merchant account" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, cancelPaymentByReferenceSpec);
    return new AdyenClient(ctx).post("/cancels", body);
  },
};

export default cancelPaymentByReference;
