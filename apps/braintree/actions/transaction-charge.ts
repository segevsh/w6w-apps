import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient, requestKey } from "../lib/client.ts";
import { TRANSACTION_FULL } from "../lib/selections.ts";
import {
  type ChargeInput,
  chargeParams,
  TRANSACTION_OUTPUT,
  transactionInput,
} from "../lib/transactions.ts";

/** `chargePaymentMethod` — authorize and submit for settlement in one step. */
const transactionCharge: ActionDefinition<ChargeInput> = {
  key: "transaction-charge",
  type: "perform",
  resource: "transaction",
  title: "Charge Payment Method",
  description:
    "Charge a vaulted payment method or single-use nonce: authorizes and submits for settlement in one step.",
  idempotent: true,
  params: chargeParams,
  output: TRANSACTION_OUTPUT,

  async execute(input, ctx) {
    const client = new BraintreeClient(ctx);
    const key = requestKey(client, input.apiRequestKey);
    const payload = await client.field<{ transaction: Record<string, unknown> | null }>(
      "chargePaymentMethod",
      `mutation Charge($input: ChargePaymentMethodInput!) {
        chargePaymentMethod(input: $input) { transaction { ${TRANSACTION_FULL} } }
      }`,
      {
        input: {
          paymentMethodId: input.paymentMethodId,
          transaction: transactionInput(input),
          ...(key ? { apiRequestKey: key } : {}),
        },
      },
    );
    return payload.transaction ?? {};
  },
};

export default transactionCharge;
