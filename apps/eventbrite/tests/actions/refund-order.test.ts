import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/refund-order.ts";

Deno.test("refund-order: POSTs refund body with snake_case fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({
    orderId: "o/1",
    reason: "event_cancelled",
    sendRefundEmail: false,
    refundMethod: "donation",
    refundRetentionPolicyStrategyCode: "retain_fee_to_attendee",
    extra: { notes: "x" },
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/orders/o%2F1/refunds/");
  assertEquals(JSON.parse(calls[0].body!), {
    reason: "event_cancelled",
    send_refund_email: false,
    refund_method: "donation",
    refund_retention_policy_strategy_code: "retain_fee_to_attendee",
    notes: "x",
  });
});

Deno.test("refund-order: empty body when only id", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ orderId: "o1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/orders/o1/refunds/");
  assertEquals(JSON.parse(calls[0].body!), {});
});
