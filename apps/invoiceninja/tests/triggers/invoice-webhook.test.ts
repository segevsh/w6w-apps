import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/invoice-webhook.ts";
import { mockNinjaCtx } from "../_helpers.ts";

const callbackUrl = "https://hooks.example.test/ninja/sub_1";

test("invoice-webhook: replaces leftovers, stores its id, tolerates a gone delete, and maps duplicate payloads", async () => {
  const subscribeMock = mockNinjaCtx([
    { body: { data: [{ id: "old", target_url: callbackUrl }] } },
    { body: {} },
    { body: { data: { id: "new" } } },
  ]);
  const state = await trigger.onSubscribe!({
    params: { eventId: "invoice.created" },
    callbackUrl,
    subscriptionId: "sub",
  }, subscribeMock.ctx);
  assertEquals(state, { webhookId: "new" });
  assertEquals(subscribeMock.calls.map((call) => [call.method, new URL(call.url).pathname]), [
    ["GET", "/api/v1/webhooks"],
    ["DELETE", "/api/v1/webhooks/old"],
    ["POST", "/api/v1/webhooks"],
  ]);
  assertEquals(JSON.parse(subscribeMock.calls[2].body!), {
    event_id: "invoice.created",
    target_url: callbackUrl,
    format: "JSON",
  });
  for (const status of [404, 410]) {
    await trigger.onUnsubscribe!(
      { params: {}, state, subscriptionId: "sub" },
      mockNinjaCtx([{ status, body: {} }]).ctx,
    );
  }
  assertEquals(
    trigger.handleIngest!({
      raw: { method: "POST", path: "", query: {}, headers: {}, body: [{ id: "e1" }, { id: "e1" }] },
      params: {},
      state,
      subscriptionId: "sub",
    }, mockNinjaCtx().ctx),
    [{ id: "e1" }],
  );
});
