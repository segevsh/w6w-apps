import { assertEquals } from "@std/assert";
import action from "../../actions/store-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("store-list: GET /stores maps params to the vendor's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: { stores: [{ id: "a" }], cursor: "c2" } }]);
  const out = await action.execute({
    storeIds: "s1, s2",
    showDeleted: true,
    updatedAtMin: "2026-01-01T00:00:00.000Z",
  }, ctx) as { stores: unknown[]; cursor?: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/stores");
  assertEquals(queryOf(calls[0].url), {
    store_ids: "s1,s2",
    show_deleted: "true",
    updated_at_min: "2026-01-01T00:00:00.000Z",
  });
  assertEquals(out.stores.length, 1);
  assertEquals(out.cursor, "c2");
});

Deno.test("store-list: no params sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { stores: [] } }]);
  const out = await action.execute({}, ctx) as { cursor?: string };
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.cursor, undefined);
});
