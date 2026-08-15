import { assertEquals } from "@std/assert";
import downsellGet from "../../actions/downsell-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("downsell-get: calls GET /downsells/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { downsell_id: "1", name: "My Downsell" } }]);
  const out = await downsellGet.execute({ downsellId: "1" }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/api/external/downsells/1");
  assertEquals(out.name, "My Downsell");
});
