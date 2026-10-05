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
 * `POST /payments/{paymentPspReference}/amountUpdates` returns HTTP 201; `status` is `authorised`,
 *
 * `received` or `refused`.
 */
interface Input {
  merchantAccount?: string;
  paymentPspReference: string;
  currency: string;
  value: number;
  reference?: string;
  industryUsage?: string;
  adjustAuthType?: string;
  additionalFields?: unknown;
}

const updateAuthorisedAmountSpec: BodySpec = {
  fields: ["reference", "industryUsage", "adjustAuthType"],
  amount: true,
};

const updateAuthorisedAmount: ActionDefinition<Input> = {
  key: "update-authorised-amount",
  type: "perform",
  resource: "modification",
  title: "Update Authorised Amount",
  description: "Increase or decrease the amount of an authorised payment before it is captured.",
  idempotent: false,
  params: [
    merchantAccountParam,
    pspReferenceParam,
    currencyParam,
    valueParam,
    referenceParam("Reference", false),
    {
      key: "industryUsage",
      label: "Industry usage",
      type: "select",
      options: [{ value: "delayedCharge", label: "delayedCharge" }, {
        value: "installment",
        label: "installment",
      }, { value: "noShow", label: "noShow" }],
    },
    {
      key: "adjustAuthType",
      label: "Adjustment type",
      type: "select",
      options: [{
        value: "cardholderInitiatedTransaction",
        label: "cardholderInitiatedTransaction",
      }, { value: "merchantInitiatedTransaction", label: "merchantInitiatedTransaction" }],
    },
    additionalFieldsParam,
  ],
  output: [
    { key: "pspReference", type: "string", label: "PSP reference of this request" },
    { key: "paymentPspReference", type: "string", label: "PSP reference of the payment" },
    { key: "status", type: "string", label: "Status (received)" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "merchantAccount", type: "string", label: "Merchant account" },
    { key: "amount", type: "object", label: "New amount" },
    { key: "industryUsage", type: "string", label: "Industry usage" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, updateAuthorisedAmountSpec);
    return new AdyenClient(ctx).post(
      `/payments/${encodeId(input.paymentPspReference)}/amountUpdates`,
      body,
    );
  },
};

export default updateAuthorisedAmount;
