import { assertEquals } from "@std/assert";
import ordersList from "../../actions/orders-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("orders-list: fetches GET /orders with only page/limit — no other filters exist", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([]) }]);
  await ordersList.execute({ page: 1, limit: 25 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/public/v1/orders");
  assertEquals(queryOf(calls[0].url), { page: "1", limit: "25" });
});
