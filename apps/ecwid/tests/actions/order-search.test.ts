import { assertEquals } from "@std/assert";
import orderSearch from "../../actions/order-search.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-search: calls GET /orders and returns the page", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([{ id: "EBJFT" }], { total: 23 }) }]);
  const out = await orderSearch.execute({ limit: 50 }, ctx) as {
    items: unknown[];
    total: number;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/orders");
  assertEquals(queryOf(calls[0].url), { limit: "50" });
  assertEquals(out.total, 23);
  assertEquals(out.items, [{ id: "EBJFT" }]);
});

Deno.test("order-search: multiple statuses go out as one comma-separated value", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([]) }]);
  await orderSearch.execute(
    {
      email: "buyer@example.com",
      fulfillmentStatus: "SHIPPED,DELIVERED",
      paymentStatus: "PAID",
      createdFrom: "2026-01-15 00:00:00",
      createdTo: "2026-01-31 23:59:59",
      couponCode: "SPRING",
    },
    ctx,
  );

  const query = queryOf(calls[0].url);
  assertEquals(query.fulfillmentStatus, "SHIPPED,DELIVERED");
  assertEquals(query.paymentStatus, "PAID");
  assertEquals(query.email, "buyer@example.com");
  assertEquals(query.createdFrom, "2026-01-15 00:00:00");
  assertEquals(query.couponCode, "SPRING");
});

Deno.test("order-search: there is no status or orderNumber filter, and none is invented", () => {
  const keys = (orderSearch.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("status"), false);
  assertEquals(keys.includes("orderNumber"), false);
  assertEquals(keys.includes("fulfillmentStatus"), true);
  assertEquals(keys.includes("paymentStatus"), true);
});
