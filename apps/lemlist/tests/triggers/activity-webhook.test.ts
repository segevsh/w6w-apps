import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import trigger from "../../triggers/activity-webhook.ts";
import { mockCtx } from "../_helpers.ts";

const callbackUrl = "https://hooks.example.test/lemlist/sub_1";

test("activity-webhook: replaces leftovers, stores its id and secret, tolerates a gone delete, and maps duplicate payloads", async () => {
  const subscribeMock = mockCtx([{ body: [{ _id: "old", targetUrl: callbackUrl }] }, {
    body: {},
  }, { body: { _id: "new" } }]);
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
  assertEquals(JSON.parse(subscribeMock.calls[2].body!).targetUrl, callbackUrl);
  for (const status of [404, 410]) {
    await trigger.onUnsubscribe!(
      { params: {}, state, subscriptionId: "sub" },
      mockCtx([{ status, body: {} }]).ctx,
    );
  }
  assertEquals(
    trigger.handleIngest!({
      raw: {
        method: "POST",
        path: "",
        query: {},
        headers: {},
        body: { _id: "a1", secret: state.secret },
      },
      params: {},
      state,
      subscriptionId: "sub",
    }, mockCtx().ctx),
    [{ _id: "a1" }],
  );
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        trigger.handleIngest!({
          raw: {
            method: "POST",
            path: "",
            query: {},
            headers: {},
            body: { _id: "a2", secret: "wrong" },
          },
          params: {},
          state,
          subscriptionId: "sub",
        }, mockCtx().ctx)
      ),
    "secret",
  );
});
