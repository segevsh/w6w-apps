import { assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-subscription.ts";

Deno.test("get-subscription: is a read action over the subscription resource", () => {
  assertEquals(action.key, "get-subscription");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "subscription");
});

Deno.test("get-subscription: GETs /subscriptions/{id} with no query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { subscription: { id: "sub_1" } } }]);
  await action.execute({ subscriptionId: "sub_1" }, connected(ctx));
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/api/v2/subscriptions/sub_1");
  assertEquals(url.search, "");
});

Deno.test("get-subscription: does NOT silently use the scheduled-changes endpoint", async () => {
  // "What is billed now" and "what will be billed after the scheduled change"
  // are different questions with different endpoints.
  const { ctx, calls } = mockCtx([{ status: 200, body: { subscription: {} } }]);
  await action.execute({ subscriptionId: "sub_1" }, connected(ctx));
  assertEquals(new URL(calls[0].url).pathname.includes("scheduled_changes"), false);
  assertEquals(new URL(calls[0].url).pathname.includes("retrieve_with"), false);
});

Deno.test("get-subscription: returns subscription, customer and card together", async () => {
  const body = { subscription: { id: "sub_1" }, customer: { id: "c1" }, card: { last4: "4242" } };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute({ subscriptionId: "sub_1" }, connected(ctx)), body);
  assertEquals(
    (action.output as Array<{ key: string }>).map((o) => o.key),
    ["subscription", "customer", "card"],
  );
});
