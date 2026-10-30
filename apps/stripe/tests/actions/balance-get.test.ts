import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/balance-get.ts";

test("balance-get: GETs /balance and takes no params", async () => {
  const { ctx, calls } = mockCtx([{ body: { available: [], pending: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/balance");
  assertEquals(action.params, []);
});
