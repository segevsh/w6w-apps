import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listGrowthTools from "../../actions/list-growth-tools.ts";

Deno.test("list-growth-tools: GETs getGrowthTools, not the deprecated getWidgets", async () => {
  // Manychat's own description on getWidgets reads "Use getGrowthTools instead".
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [] } }]);
  await listGrowthTools.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/getGrowthTools");
  assert(!calls[0].url.includes("getWidgets"));
});

Deno.test("list-growth-tools: returns the tool array", async () => {
  const { ctx } = mockCtx([
    { body: { status: "success", data: [{ id: 1, name: "Ref link", type: "ref_url" }] } },
  ]);
  const out = await listGrowthTools.execute!({}, ctx) as { data: Array<{ type: string }> };
  assertEquals(out.data[0].type, "ref_url");
});
