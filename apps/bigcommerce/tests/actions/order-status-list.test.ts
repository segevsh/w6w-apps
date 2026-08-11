import { assert, assertEquals } from "@std/assert";
import orderStatusList from "../../actions/order-status-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("order-status-list: GETs /v2/order_statuses and returns the bare array", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: 11, name: "Awaiting Fulfillment", system_label: "Awaiting Fulfillment" }],
  }]);
  const out = await orderStatusList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/order_statuses");
  assertEquals(out.statuses.length, 1);
});

Deno.test("order-status-list: an empty 204 is an empty list", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await orderStatusList.execute({}, ctx), { statuses: [] });
});

Deno.test("order-status-list: explains why the numeric id is what to match on", () => {
  assert(orderStatusList.description?.includes("merchant-customised"), orderStatusList.description);
  assertEquals(orderStatusList.params, []);
});
