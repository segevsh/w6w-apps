import { assertEquals } from "@std/assert";
import templateGet from "../../actions/template-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-get: GET by uuid; blank rejects", async () => {
  const { ctx, calls } = mockCtx([{ body: { uuid: "t 1", layers: [] } }]);
  await templateGet.execute({ template_uuid: "t 1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/templates/t%201");
  await assertRejects(() => templateGet.execute({ template_uuid: "" }, mockCtx().ctx));
});
