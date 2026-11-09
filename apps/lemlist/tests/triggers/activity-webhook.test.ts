import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/activity-webhook.ts";
import { mockCtx } from "../_helpers.ts";

const callbackUrl = "https://hooks.example.test/lemlist/sub_1";

test("activity-webhook: replaces leftovers, stores its id and secret, tolerates a gone delete, and maps duplicate payloads", async () => {
  const subscribeMock = mockCtx([{ body: { data: [{ id: "old", url: callbackUrl }] } }, {
    body: {},
  }, { body: { id: "new" } }]);
  const state = await trigger.onSubscribe!(
    { params: {}, callbackUrl, subscriptionId: "sub" },
    subscribeMock.ctx,
  );
  assertEquals(state.webhookId, "new");
  assertEquals(state.secret.length, 64);
  assertEquals(subscribeMock.calls.map((call) => [call.method, new URL(call.url).pathname]), [
    ["GET", "/api/hooks"],
    ["DELETE", "/api/hooks/old"],
    ["POST", "/api/hooks"],
  ]);
  assertEquals(JSON.parse(subscribeMock.calls[2].body!).url, callbackUrl);
  await trigger.onUnsubscribe!(
    { params: {}, state, subscriptionId: "sub" },
    mockCtx([{ status: 410, body: {} }]).ctx,
  );
  assertEquals(
    trigger.handleIngest!({
      raw: {
        method: "POST",
        path: "",
        query: {},
        headers: {},
        body: [{ _id: "a1" }, { _id: "a1" }],
      },
      params: {},
      state,
      subscriptionId: "sub",
    }, mockCtx().ctx),
    [{ _id: "a1" }],
  );
});
