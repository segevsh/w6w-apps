import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import subscriptionCancel from "../../actions/subscription-cancel.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("subscription-cancel: POSTs to /subscriptions/{id}/cancel with the reason", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope("subscription", { id: 1, status: "cancelled" }) },
  ]);
  await subscriptionCancel.execute(
    { subscriptionId: "1", cancellationReason: "other reason", sendEmail: false },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/subscriptions/1/cancel");
  assertEquals(
    JSON.parse(calls[0].body!),
    { cancellation_reason: "other reason", send_email: false },
  );
});

test("subscription-cancel: not marked idempotent", () => {
  assertEquals(subscriptionCancel.idempotent, false);
});
