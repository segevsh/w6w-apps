import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, type BodySpec, buildBody } from "../lib/client.ts";
import {
  additionalFieldsParam,
  currencyParam,
  merchantAccountParam,
  valueParam,
} from "../lib/params.ts";

/**
 * `POST /paymentMethods/balance`. Read-only lookup against the card issuer.
 *
 * See the Checkout API v72 reference.
 */
interface Input {
  merchantAccount?: string;
  paymentMethod: unknown;
  currency: string;
  value: number;
  additionalFields?: unknown;
}

const getPaymentMethodsBalanceSpec: BodySpec = { json: ["paymentMethod"], amount: true };

const getPaymentMethodsBalance: ActionDefinition<Input> = {
  key: "get-payment-methods-balance",
  type: "read",
  resource: "payment",
  title: "Get Gift Card Balance",
  description: "Check the balance of a gift card before using it for a partial payment.",
  params: [
    merchantAccountParam,
    {
      key: "paymentMethod",
      label: "Payment method",
      type: "json",
      required: true,
      hint:
        'The gift card, for example {"type":"giftcard","brand":"givex","number":"...","cvc":"..."}.',
    },
    currencyParam,
    valueParam,
    additionalFieldsParam,
  ],
  output: [
    { key: "resultCode", type: "string", label: "Result code (Success, NotEnoughBalance, Failed)" },
    { key: "balance", type: "object", label: "Balance" },
    { key: "transactionLimit", type: "object", label: "Transaction limit" },
    { key: "pspReference", type: "string", label: "PSP reference" },
    { key: "refusalReason", type: "string", label: "Refusal reason" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, getPaymentMethodsBalanceSpec);
    return new AdyenClient(ctx).post("/paymentMethods/balance", body);
  },
};

export default getPaymentMethodsBalance;
