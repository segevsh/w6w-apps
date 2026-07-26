import { assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/order-get-many.ts";

Deno.test("order-get-many: sends the status filters", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { orders: [] } }]);
  await action.execute({ status: "any", financialStatus: "paid" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("status"), "any");
  assertEquals(q.get("financial_status"), "paid");
});

Deno.test("order-get-many: drops the filters when paging with a cursor", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { orders: [] } }]);
  await action.execute({ status: "any", pageInfo: "NEXT" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("page_info"), "NEXT");
  assertEquals(q.has("status"), false);
});
