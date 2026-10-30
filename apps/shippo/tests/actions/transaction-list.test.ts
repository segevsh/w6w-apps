import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/transaction-list.ts";

test("transaction-list: reads GET /transactions with pagination params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [], next: null } }]);
  await action.execute!({ results: 5, page: 1 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/transactions");
  assertEquals(url.searchParams.get("results"), "5");
});

test("transaction-list: is read-only", () => {
  assertEquals(action.type, "read");
});
