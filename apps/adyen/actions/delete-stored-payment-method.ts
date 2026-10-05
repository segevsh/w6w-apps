import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, encodeId, merchantAccountFor } from "../lib/client.ts";
import { merchantAccountParam, shopperReferenceParam } from "../lib/params.ts";

/**
 * `DELETE /storedPaymentMethods/{id}?shopperReference=&merchantAccount=` — all three required. Adyen
 *
 * answers HTTP 204 with no body; the action reports `deleted: true`. A second call finds nothing
 * to delete and errors, so it is not idempotent.
 */
interface Input {
  merchantAccount?: string;
  storedPaymentMethodId: string;
  shopperReference: string;
}

const deleteStoredPaymentMethod: ActionDefinition<Input> = {
  key: "delete-stored-payment-method",
  type: "perform",
  resource: "stored-payment-method",
  title: "Delete Stored Payment Method",
  description: "Delete a stored payment method (token) so it can no longer be charged.",
  idempotent: false,
  params: [
    merchantAccountParam,
    {
      key: "storedPaymentMethodId",
      label: "Stored payment method ID",
      type: "string",
      required: true,
      hint: "The id from list-stored-payment-methods.",
    },
    shopperReferenceParam(true),
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Whether it was deleted" },
    { key: "storedPaymentMethodId", type: "string", label: "Stored payment method ID" },
  ],

  async execute(input, ctx) {
    const merchantAccount = merchantAccountFor(input.merchantAccount, ctx.connection);
    await new AdyenClient(ctx).delete(
      `/storedPaymentMethods/${encodeId(input.storedPaymentMethodId)}`,
      { merchantAccount, shopperReference: input.shopperReference },
    );
    return { deleted: true, storedPaymentMethodId: input.storedPaymentMethodId };
  },
};

export default deleteStoredPaymentMethod;
