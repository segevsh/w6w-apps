import { assertEquals } from "@std/assert";
import orderList from "../../actions/order-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-list: lists orders and passes through the vendor's filters", async () => {
  const page = { orders: [{ id: "A" }, { id: "B" }], total_count: 2 };
  const { ctx, calls } = mockCtx([{ status: 200, body: page }]);
  const result = await orderList.execute(
    { campaignId: "IVM0I3WNJJL0", createdAtGte: "2026-07-15T18:12:18Z", limit: 25 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v2/orders");
  const q = queryOf(calls[0].url);
  assertEquals(q.campaign_id, "IVM0I3WNJJL0");
  assertEquals(q["created_at[gte]"], "2026-07-15T18:12:18Z");
  assertEquals(q.limit, "25");
  assertEquals(result, page);
});

Deno.test("order-list: omits unset filters rather than sending empty query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { orders: [], total_count: 0 } }]);
  await orderList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
