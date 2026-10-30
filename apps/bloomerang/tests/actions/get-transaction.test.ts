import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-transaction.ts";

test("get-transaction: is a read action", () => {
  assertEquals(action.type, "read");
});

test("get-transaction: GETs /transaction/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 77, TransactionNumber: 5001 } }]);
  const result = await action.execute({ id: 77 }, ctx) as { Id: number };
  assertEquals(new URL(calls[0].url).pathname, "/v2/transaction/77");
  assertEquals(result.Id, 77);
});
