import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import upsellGet from "../../actions/upsell-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("upsell-get: calls GET /upsells/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { upsell_id: "1", name: "My Upsell" } }]);
  const out = await upsellGet.execute({ upsellId: "1" }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/api/external/upsells/1");
  assertEquals(out.name, "My Upsell");
});
