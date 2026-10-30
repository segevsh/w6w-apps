import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-subscription.ts";

test("get-subscription: is a read action requiring subscriptionId", () => {
  assertEquals(action.key, "get-subscription");
  assertEquals(action.type, "read");
  const p = (action.params ?? []).find((p) => p.key === "subscriptionId")!;
  assertEquals(p.required, true);
});

test("get-subscription: GETs /subscriptions/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "s1" } }]);
  await action.execute({ subscriptionId: "uuid-abc" }, connected(ctx));
  assertEquals(new URL(calls[0].url).pathname, "/subscriptions/uuid-abc");
});
