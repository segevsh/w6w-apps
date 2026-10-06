import { assertEquals } from "@std/assert";
import action from "../../actions/item-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("item-list: GET /items maps params to the vendor's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "a" }], cursor: "c2" } }]);
  const out = await action.execute({
    itemIds: "i1",
    createdAtMin: "2026-01-01T00:00:00.000Z",
    cursor: "k",
  }, ctx) as { items: unknown[]; cursor?: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/items");
  assertEquals(queryOf(calls[0].url), {
    items_ids: "i1",
    created_at_min: "2026-01-01T00:00:00.000Z",
    cursor: "k",
  });
  assertEquals(out.items.length, 1);
  assertEquals(out.cursor, "c2");
});

Deno.test("item-list: no params sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  const out = await action.execute({}, ctx) as { cursor?: string };
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.cursor, undefined);
});
