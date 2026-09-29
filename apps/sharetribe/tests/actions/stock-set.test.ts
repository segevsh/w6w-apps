import { assertEquals } from "@std/assert";
import stockSet from "../../actions/stock-set.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("stock-set: POST /stock/compare_and_set with listingId/oldTotal/newTotal", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: { id: "s1", type: "stock", attributes: { quantity: 10 } } } },
  ]);
  const result = await stockSet.execute({ listingId: "l1", oldTotal: 8, newTotal: 10 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/stock/compare_and_set");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { listingId: "l1", oldTotal: 8, newTotal: 10 });
  assertEquals((result as { attributes: { quantity: number } }).attributes.quantity, 10);
});

Deno.test("stock-set: sends oldTotal as null when the listing has no stock defined yet", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "s1" } } }]);
  await stockSet.execute({ listingId: "l1", newTotal: 5 }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body, { listingId: "l1", oldTotal: null, newTotal: 5 });
});
