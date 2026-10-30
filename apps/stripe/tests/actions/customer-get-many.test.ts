import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-get-many.ts";

test("customer-get-many: GETs /customers with the cursor params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ email: "a@b.test", limit: 5, startingAfter: "cus_9" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("email"), "a@b.test");
  assertEquals(q.get("limit"), "5");
  assertEquals(q.get("starting_after"), "cus_9");
  assertEquals(q.has("ending_before"), false);
});
