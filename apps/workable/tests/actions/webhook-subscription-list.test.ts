import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/webhook-subscription-list.ts";

test("webhook-subscription-list: GETs /subscriptions", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { subscriptions: [{ id: 1 }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/subscriptions");
  assertEquals(out, { subscriptions: [{ id: 1 }] });
});
