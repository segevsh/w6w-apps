import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-orders.ts";

Deno.test("list-orders: GETs /v2/sites/{id}/orders and forwards status filter", async () => {
  const body = { orders: [], pagination: { total: 0 } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ siteId: "s1", status: "pending" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/sites/s1/orders");
  assertEquals(url.searchParams.get("status"), "pending");
  assertEquals(result, body);
});
