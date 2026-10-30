import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import transactionUpdate from "../../actions/transaction-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("transaction-update: PATCHes /transaction/{id} with note and categoryId", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tx_1", note: "reimbursed" } }]);
  await transactionUpdate.execute({
    transactionId: "tx_1",
    note: "reimbursed",
    categoryId: "cat_1",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/transaction/tx_1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { note: "reimbursed", categoryId: "cat_1" });
});

test("transaction-update: a blank note/categoryId sends null, clearing rather than omitting", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await transactionUpdate.execute({ transactionId: "tx_1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { note: null, categoryId: null });
});

test("transaction-update: declares idempotent true (a full-field reassignment)", () => {
  assertEquals(transactionUpdate.idempotent, true);
});
