import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-refund-retention-policy.ts";

Deno.test("get-refund-retention-policy: GETs policy with query", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({
    orderId: "o1",
    refundReasonCode: "other_reason_not_listed",
    totalRefundAmount: "10.00",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/orders/o1/get_retention_policy_information/");
  assertEquals(url.searchParams.get("refund_reason_code"), "other_reason_not_listed");
  assertEquals(url.searchParams.get("total_refund_amount"), "10.00");
  assertEquals(calls[0].body, null);
});
