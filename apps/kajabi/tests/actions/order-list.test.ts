import { assertEquals } from "@std/assert";
import orderList from "../../actions/order-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-list: GETs the collection with every documented filter mapped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "orders") }]);
  await orderList.execute({
    siteId: "111",
    customerId: "456",
    orderNumber: "12345",
    unfulfilledOnly: true,
    sort: "-created_at",
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/orders");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["filter[customer_id]"], "456");
  assertEquals(q["filter[order_number_eq]"], "12345");
  assertEquals(q["filter[fulfilled_at_null]"], "true");
  assertEquals(q["sort"], "-created_at");
});

Deno.test("order-list: sends no query at all when nothing is filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "orders") }]);
  await orderList.execute({}, ctx);
  assertEquals(queryOf(calls[0]), {});
});
