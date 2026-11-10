import { test } from "node:test";
import assert from "node:assert/strict";
import { mockCtx, OK } from "../_helpers.ts";
import trigger from "../../triggers/new-customer-transaction.ts";

const response = (transaction: unknown[]) => ({ body: { ...OK, transactions: { transaction } } });

test("new-customer-transaction seeds, emits, retries, and sends the sorted list request", async () => {
  const params = { customerProfileId: "p1" };
  const seed = await trigger.poll!(
    { params, state: {} },
    mockCtx([response([{ transId: "a" }])]).ctx,
  );
  assert.deepStrictEqual(seed.events, []);
  const nextCtx = mockCtx([response([{ transId: "b" }, { transId: "a" }])]);
  const next = await trigger.poll!({ params, state: seed.nextState }, nextCtx.ctx);
  assert.deepStrictEqual(next.events, [{ transId: "b" }]);
  const retry = await trigger.poll!(
    { params, state: seed.nextState },
    mockCtx([response([{ transId: "b" }, { transId: "a" }])]).ctx,
  );
  assert.deepStrictEqual(retry, next);
  assert.deepStrictEqual(nextCtx.calls[0].url, "https://apitest.authorize.net/xml/v1/request.api");
  assert.deepStrictEqual(JSON.parse(nextCtx.calls[0].unsignedBody), {
    getTransactionListForCustomerRequest: {
      customerProfileId: "p1",
      sorting: { orderBy: "submitTimeUTC", orderDescending: true },
      paging: { limit: 100, offset: 1 },
    },
  });
});
