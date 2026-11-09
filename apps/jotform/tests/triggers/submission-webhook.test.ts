import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/submission-webhook.ts";
import { envelope, mockCtx } from "../_helpers.ts";

const callbackUrl = "https://hooks.example.test/jotform/sub_1";

test("submission-webhook: replaces leftovers, stores its id, tolerates a gone delete, and maps duplicate payloads", async () => {
  const subscribeMock = mockCtx([{ body: envelope({ old: callbackUrl }) }, { body: envelope({}) }, {
    body: envelope({ id: "new" }),
  }]);
  const state = await trigger.onSubscribe!({
    params: { formId: "f1" },
    callbackUrl,
    subscriptionId: "sub",
  }, subscribeMock.ctx);
  assertEquals(state, { webhookId: "new", formId: "f1" });
  assertEquals(subscribeMock.calls.map((call) => [call.method, new URL(call.url).pathname]), [
    ["GET", "/form/f1/webhooks"],
    ["DELETE", "/form/f1/webhooks/old"],
    ["POST", "/form/f1/webhooks"],
  ]);
  assertEquals(
    subscribeMock.calls[2].body,
    "webhookURL=https%3A%2F%2Fhooks.example.test%2Fjotform%2Fsub_1",
  );
  await trigger.onUnsubscribe!(
    { params: {}, state, subscriptionId: "sub" },
    mockCtx([{ status: 404, body: { responseCode: 404, message: "gone", content: {} } }]).ctx,
  );
  assertEquals(
    trigger.handleIngest!({
      raw: {
        method: "POST",
        path: "",
        query: {},
        headers: {},
        body: [{ submissionID: "s1" }, { submissionID: "s1" }],
      },
      params: {},
      state,
      subscriptionId: "sub",
    }, mockCtx().ctx),
    [{ submissionID: "s1" }],
  );
});
