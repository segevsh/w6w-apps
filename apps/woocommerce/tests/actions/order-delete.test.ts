import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-delete.ts";

const display = { storeUrl: "https://shop.example.com" };

Deno.test("order-delete: DELETEs /orders/{id} with force=true by default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ orderId: "42" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/wp-json/wc/v3/orders/42");
  assertEquals(url.searchParams.get("force"), "true");
});

Deno.test("order-delete: force=false moves to trash", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ orderId: "42", force: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("force"), "false");
});
