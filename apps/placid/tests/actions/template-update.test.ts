import { assertEquals } from "@std/assert";
import templateUpdate from "../../actions/template-update.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-update: PATCH with title/tags/custom_data; empty update rejected", async () => {
  const { ctx, calls } = mockCtx([{ body: { uuid: "t" } }]);
  await templateUpdate.execute({ template_uuid: "t", title: "New", tags: ["x"] }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/templates/t");
  assertEquals(JSON.parse(calls[0].body!), { title: "New", tags: ["x"] });
  await assertRejects(() => templateUpdate.execute({ template_uuid: "t" }, mockCtx().ctx));
});
