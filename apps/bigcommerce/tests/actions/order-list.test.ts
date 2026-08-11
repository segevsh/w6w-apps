import { assert, assertEquals } from "@std/assert";
import orderList from "../../actions/order-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-list: GETs the v2 path and returns the BARE array", async () => {
  // v2 has no {data, meta} envelope. Unwrapping `data` here would return
  // undefined the day BigCommerce added one, and returns nothing useful today.
  const { ctx, calls } = mockCtx([{ body: [{ id: 100 }, { id: 101 }] }]);
  const out = await orderList.execute({ limit: 50 }, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/orders");
  assertEquals(queryOf(calls[0].url), { limit: "50" });
  assertEquals(out, { orders: [{ id: 100 }, { id: 101 }] });
});

Deno.test("order-list: a 204 means no matching orders, not a broken response", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await orderList.execute({}, ctx), { orders: [] });
});

Deno.test("order-list: filters map to the v2 snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await orderList.execute({
    customerId: 5,
    statusId: 11,
    email: "jane@example.com",
    minDateCreated: "Thu, 01 Aug 2026 00:00:00 +0000",
    include: ["consignments"],
    sort: "date_created",
    page: 3,
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    customer_id: "5",
    status_id: "11",
    email: "jane@example.com",
    min_date_created: "Thu, 01 Aug 2026 00:00:00 +0000",
    include: "consignments",
    sort: "date_created",
    page: "3",
  });
});

Deno.test("order-list: says out loud that v2 gives no page count", () => {
  const limit = orderList.params?.find((p) => p.key === "limit");
  assert(limit?.hint?.includes("NO page count"), limit?.hint);
  assertEquals(limit?.default, 50);
  assertEquals(limit?.validation?.max, 250);
});
