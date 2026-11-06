import assert from "node:assert/strict";
import { test } from "node:test";
import action from "../../actions/void-payment.ts";
import { mockCtx } from "../_helpers.ts";

test("void-payment: builds the precise transaction sequence and is not automatically retryable", async () => {
  const { ctx, calls } = mockCtx();
  await action.execute({ "refTransId": "12345" }, ctx);
  assert.equal(
    calls[0].body,
    JSON.stringify({
      createTransactionRequest: {
        merchantAuthentication: { name: "TEST_LOGIN", transactionKey: "TEST_TRANSACTION_KEY" },
        transactionRequest: { "transactionType": "voidTransaction", "refTransId": "12345" },
      },
    }),
  );
  assert.equal(action.idempotent, false);
});
