import { assertEquals } from "@std/assert";
import mmsGet from "../../actions/mms-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mms-get: GETs the MMS by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1", content_urls: [] } }]);
  const out = await mmsGet.execute({ id: "m1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v2/mms/m1");
  assertEquals(out.id, "m1");
});
