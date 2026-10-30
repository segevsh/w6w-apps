import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import subscriptionListAll from "../../actions/subscription-list-all.ts";
import { list, mockCtx, pathOf } from "../_helpers.ts";

test("subscription-list-all: unwraps _embedded.subscriptions account-wide, at /subscriptions", async () => {
  const { ctx, calls } = mockCtx([{
    body: list("subscriptions", [{ id: "sub_1" }, { id: "sub_2" }]),
  }]);
  const out = await subscriptionListAll.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/subscriptions");
  assertEquals(out, { count: 2, items: [{ id: "sub_1" }, { id: "sub_2" }] });
});
