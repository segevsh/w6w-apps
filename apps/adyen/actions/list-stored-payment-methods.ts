import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, merchantAccountFor } from "../lib/client.ts";
import { merchantAccountParam, shopperReferenceParam } from "../lib/params.ts";

/**
 * `GET /storedPaymentMethods?merchantAccount=&shopperReference=` (both optional in the spec).
 *
 * See the Checkout API v72 reference.
 */
interface Input {
  merchantAccount?: string;
  shopperReference?: string;
}

const listStoredPaymentMethods: ActionDefinition<Input> = {
  key: "list-stored-payment-methods",
  type: "read",
  resource: "stored-payment-method",
  title: "List Stored Payment Methods",
  description: "List the tokens (stored payment methods) saved for a shopper.",
  params: [
    merchantAccountParam,
    shopperReferenceParam(),
  ],
  output: [
    { key: "merchantAccount", type: "string", label: "Merchant account" },
    { key: "shopperReference", type: "string", label: "Shopper reference" },
    { key: "storedPaymentMethods", type: "array", label: "Stored payment methods" },
  ],

  execute(input, ctx) {
    const merchantAccount = merchantAccountFor(input.merchantAccount, ctx.connection);
    return new AdyenClient(ctx).get("/storedPaymentMethods", {
      merchantAccount,
      shopperReference: input.shopperReference,
    });
  },
};

export default listStoredPaymentMethods;
