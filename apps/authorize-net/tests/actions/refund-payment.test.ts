import assert from "node:assert/strict";
import { test } from "node:test";
import action from "../../actions/refund-payment.ts";
import { mockCtx } from "../_helpers.ts";

test("refund-payment: builds the precise transaction sequence and is not automatically retryable", async () => {
  const { ctx, calls } = mockCtx();
  await action.execute({
    "refTransId": "12345",
    "amount": "1.25",
    "payment": { "creditCard": { "expirationDate": "XXXX", "cardNumber": "1111" } },
  }, ctx);
  assert.equal(
    calls[0].body,
    JSON.stringify({
      createTransactionRequest: {
        merchantAuthentication: { name: "TEST_LOGIN", transactionKey: "TEST_TRANSACTION_KEY" },
        transactionRequest: {
          "transactionType": "refundTransaction",
          "amount": "1.25",
          "payment": { "creditCard": { "cardNumber": "1111", "expirationDate": "XXXX" } },
          "refTransId": "12345",
        },
      },
    }),
  );
  assert.equal(action.idempotent, false);
});
