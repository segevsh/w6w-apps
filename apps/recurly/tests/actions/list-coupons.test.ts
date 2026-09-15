import { assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-coupons.ts";

const ok = { status: 200, body: { object: "list", has_more: false, next: null, data: [] } };

Deno.test("list-coupons: is a search action over the coupon resource", () => {
  assertEquals(action.key, "list-coupons");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "coupon");
});

Deno.test("list-coupons: GETs /coupons on the connection's own host", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ limit: 50 }, connected(ctx));
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/coupons");
  assertEquals(url.searchParams.get("limit"), "50");
});
