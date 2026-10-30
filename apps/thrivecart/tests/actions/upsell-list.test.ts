import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import upsellList from "../../actions/upsell-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("upsell-list: calls GET /upsells and wraps the bare array as items", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ upsell_id: "1" }] }]);
  const out = await upsellList.execute({}, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/external/upsells");
  assertEquals(out.items.length, 1);
});
