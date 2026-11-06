import assert from "node:assert/strict";
import { test } from "node:test";
import action from "../../actions/charge-payment.ts";
import { mockCtx } from "../_helpers.ts";

test("charge-payment: builds the precise transaction sequence and is not automatically retryable", async () => {
  const { ctx, calls } = mockCtx();
  await action.execute({
    "amount": "12.30",
    "payment": { "creditCard": { "expirationDate": "2030-12", "cardNumber": "4111111111111111" } },
  }, ctx);
  assert.equal(
    calls[0].body,
    JSON.stringify({
      createTransactionRequest: {
        merchantAuthentication: { name: "TEST_LOGIN", transactionKey: "TEST_TRANSACTION_KEY" },
        transactionRequest: {
          "transactionType": "authCaptureTransaction",
          "amount": "12.30",
          "payment": {
            "creditCard": { "cardNumber": "4111111111111111", "expirationDate": "2030-12" },
          },
        },
      },
    }),
  );
  assert.equal(action.idempotent, false);
});
