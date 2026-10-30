import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-event-retry.ts";

test("webhook-event-retry: POSTs to the event and handles the empty 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ webhookId: "wh1", eventId: "e1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/webhooks/wh1/events/e1");
  assertEquals(calls[0].body, null);
  assertEquals(result, { eventId: "e1", retried: true });
});

test("webhook-event-retry: is NOT idempotent — each call redelivers", () => {
  assertEquals(action.idempotent, false);
});
