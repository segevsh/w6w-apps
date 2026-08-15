import { assertEquals } from "@std/assert";
import downsellList from "../../actions/downsell-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("downsell-list: calls GET /downsells and wraps the bare array as items", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ downsell_id: "1" }] }]);
  const out = await downsellList.execute({}, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/external/downsells");
  assertEquals(out.items.length, 1);
});
