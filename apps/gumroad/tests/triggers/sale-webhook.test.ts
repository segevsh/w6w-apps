import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/sale-webhook.ts";
import { mockCtx } from "../_helpers.ts";

const callbackUrl = "https://hooks.example.test/gumroad/sub_1";

test("sale-webhook: replaces leftovers, stores its id, tolerates a gone delete, and maps duplicate payloads", async () => {
  const subscribeMock = mockCtx([
    { body: { success: true, resource_subscriptions: [{ id: "old", post_url: callbackUrl }] } },
    { body: { success: true } },
    { body: { success: true, resource_subscription: { id: "new" } } },
  ]);
  const state = await trigger.onSubscribe!(
    { params: {}, callbackUrl, subscriptionId: "sub" },
    subscribeMock.ctx,
  );
  assertEquals(state, { webhookId: "new" });
  assertEquals(subscribeMock.calls.map((call) => [call.method, new URL(call.url).pathname]), [
    ["GET", "/v2/resource_subscriptions"],
    ["DELETE", "/v2/resource_subscriptions/old"],
    ["PUT", "/v2/resource_subscriptions"],
  ]);
  assertEquals(new URL(subscribeMock.calls[0].url).search, "?resource_name=sale");
  assertEquals(
    subscribeMock.calls[2].body,
    "resource_name=sale&post_url=https%3A%2F%2Fhooks.example.test%2Fgumroad%2Fsub_1",
  );
  for (const status of [404, 410]) {
    await trigger.onUnsubscribe!(
      { params: {}, state, subscriptionId: "sub" },
      mockCtx([{ status, body: { success: false } }]).ctx,
    );
  }
  assertEquals(
    trigger.handleIngest!({
      raw: {
        method: "POST",
        path: "",
        query: {},
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "sale_id=s1&order_number=42&email=buyer%40example.test",
      },
      params: {},
      state,
      subscriptionId: "sub",
    }, mockCtx().ctx),
    [{ sale_id: "s1", order_number: "42", email: "buyer@example.test" }],
  );
});
