import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/submission-webhook.ts";
import { envelope, mockCtx } from "../_helpers.ts";

const callbackUrl = "https://hooks.example.test/jotform/sub_1";

test("submission-webhook: replaces leftovers, stores its id, tolerates a gone delete, and maps duplicate payloads", async () => {
  const subscribeMock = mockCtx([{ body: envelope({ old: callbackUrl }) }, { body: envelope({}) }, {
    body: envelope({ new: callbackUrl }),
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
  for (const status of [404, 410]) {
    await trigger.onUnsubscribe!(
      { params: {}, state, subscriptionId: "sub" },
      mockCtx([{ status, body: { responseCode: status, message: "gone", content: {} } }]).ctx,
    );
  }
  assertEquals(
    trigger.handleIngest!({
      raw: {
        method: "POST",
        path: "",
        query: {},
        headers: { "content-type": "multipart/form-data; boundary=JotformBoundary" },
        body:
          '--JotformBoundary\r\nContent-Disposition: form-data; name="submissionID"\r\n\r\ns1\r\n' +
          '--JotformBoundary\r\nContent-Disposition: form-data; name="formID"\r\n\r\nf1\r\n' +
          "--JotformBoundary--",
      },
      params: {},
      state,
      subscriptionId: "sub",
    }, mockCtx().ctx),
    [{ submissionID: "s1", formID: "f1" }],
  );
});
