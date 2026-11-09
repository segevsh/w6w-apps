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
  const ingest = (headers: Record<string, string>, body: unknown) =>
    trigger.handleIngest!({
      raw: { method: "POST", path: "", query: {}, headers, body },
      params: {},
      state,
      subscriptionId: "sub",
    }, mockCtx().ctx);
  const multipart = { "content-type": "multipart/form-data; boundary=JotformBoundary" };
  const part = (name: string, value: string) =>
    `--JotformBoundary\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;

  // R4-A1: separate top-level parts + JSON rawRequest; top-level wins on collision.
  const realistic = part("submissionID", "s1") + part("formID", "f1") + part("pretty", "a:b") +
    part("rawRequest", JSON.stringify({ q3_name: "Ada", submissionID: "WRONG" })) +
    "--JotformBoundary--";
  const events = ingest(multipart, realistic) as Record<string, unknown>[];
  assertEquals(events.length, 1);
  assertEquals(events[0].submissionID, "s1");
  assertEquals(events[0].formID, "f1");
  assertEquals(events[0].q3_name, "Ada");

  // R4-A2: a part value containing a blank line survives intact.
  const blank = ingest(
    multipart,
    part("submissionID", "s2") + part("pretty", "a\r\n\r\nb") + "--JotformBoundary--",
  ) as Record<string, unknown>[];
  assertEquals(blank[0].pretty, "a\r\n\r\nb");

  // R4-A5: an array body repeating one id yields one event.
  assertEquals(
    ingest({}, [{ submissionID: "d1" }, { submissionID: "d1" }]),
    [{ submissionID: "d1" }],
  );
});
