import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient, requestKey } from "../lib/client.ts";
import { TRANSACTION_FULL } from "../lib/selections.ts";
import {
  type ChargeInput,
  chargeParams,
  TRANSACTION_OUTPUT,
  transactionInput,
} from "../lib/transactions.ts";

/** `authorizePaymentMethod` — place a hold; capture it later. */
const transactionAuthorize: ActionDefinition<ChargeInput> = {
  key: "transaction-authorize",
  type: "perform",
  resource: "transaction",
  title: "Authorize Payment Method",
  description:
    "Authorize (hold) funds on a vaulted payment method or single-use nonce without settling; capture the transaction later.",
  idempotent: true,
  params: chargeParams,
  output: TRANSACTION_OUTPUT,

  async execute(input, ctx) {
    const client = new BraintreeClient(ctx);
    const key = requestKey(client, input.apiRequestKey);
    const payload = await client.field<{ transaction: Record<string, unknown> | null }>(
      "authorizePaymentMethod",
      `mutation Authorize($input: AuthorizePaymentMethodInput!) {
        authorizePaymentMethod(input: $input) { transaction { ${TRANSACTION_FULL} } }
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

export default transactionAuthorize;
