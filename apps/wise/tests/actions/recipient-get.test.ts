import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import recipientGet from "../../actions/recipient-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("recipient-get: GETs /accounts/{accountId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9, currency: "EUR" } }]);
  const out = await recipientGet.execute({ accountId: 9 }, ctx) as { id: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/2026Q3/accounts/9");
  assertEquals(out.id, 9);
});
