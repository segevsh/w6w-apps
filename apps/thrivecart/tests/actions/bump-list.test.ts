import { assertEquals } from "@std/assert";
import bumpList from "../../actions/bump-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bump-list: calls GET /bumps and wraps the bare array as items", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ bump_id: "1" }] }]);
  const out = await bumpList.execute({}, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/external/bumps");
  assertEquals(out.items.length, 1);
});
