import { assertEquals } from "@std/assert";
import orderItemList from "../../actions/order-item-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-item-list: GETs the collection with every documented filter mapped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "order_items") }]);
  await orderItemList.execute({
    siteId: "111",
    itemType: "Offer",
    itemId: "123",
    unfulfilledOnly: true,
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/order_items");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["filter[item_type_eq]"], "Offer");
  assertEquals(q["filter[item_id_eq]"], "123");
  assertEquals(q["filter[fulfilled_at_null]"], "true");
});

Deno.test("order-item-list: sends no query at all when nothing is filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "order_items") }]);
  await orderItemList.execute({}, ctx);
  assertEquals(queryOf(calls[0]), {});
});
