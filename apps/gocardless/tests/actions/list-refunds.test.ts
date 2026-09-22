import { assertEquals } from "@std/assert";
import listRefunds from "../../actions/list-refunds.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const page = listEnvelope("refunds", [{ id: "RF1", amount: 500 }]);

Deno.test("list-refunds: GET /refunds", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  const out = await listRefunds.execute!({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/refunds");
  assertEquals(out.items.length, 1);
});

Deno.test("list-refunds: payment, mandate, refund_type and created_at filters", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  await listRefunds.execute!({
    payment: "PM1",
    mandate: "MD1",
    refundType: "merchant_requested",
    createdAtGt: "2026-01-01T00:00:00Z",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    payment: "PM1",
    mandate: "MD1",
    refund_type: "merchant_requested",
    "created_at[gt]": "2026-01-01T00:00:00Z",
  });
});
