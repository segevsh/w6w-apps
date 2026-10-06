import { assertEquals } from "@std/assert";
import action from "../../actions/inventory-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("inventory-list: GET /inventory maps params to the vendor's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: { inventory_levels: [{ id: "a" }], cursor: "c2" } }]);
  const out = await action.execute({
    storeIds: "s1",
    variantIds: "v1,v2",
    updatedAtMin: "2026-01-01T00:00:00.000Z",
  }, ctx) as { inventory_levels: unknown[]; cursor?: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/inventory");
  assertEquals(queryOf(calls[0].url), {
    store_ids: "s1",
    variant_ids: "v1,v2",
    updated_at_min: "2026-01-01T00:00:00.000Z",
  });
  assertEquals(out.inventory_levels.length, 1);
  assertEquals(out.cursor, "c2");
});

Deno.test("inventory-list: no params sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { inventory_levels: [] } }]);
  const out = await action.execute({}, ctx) as { cursor?: string };
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.cursor, undefined);
});
