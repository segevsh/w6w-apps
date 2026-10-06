import { assertEquals, assertRejects } from "@std/assert";
import templateVersionCreate from "../../actions/template-version-create.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-version-create: POSTs the new html under the template's versions", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "vrsn_2", object: "version" } }]);
  const out = await templateVersionCreate.execute({
    templateId: "tmpl_1",
    html: "<b>v2</b>",
    engine: "legacy",
  }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/templates/tmpl_1/versions");
  assertEquals(bodyOf(calls[0]), { html: "<b>v2</b>", engine: "legacy" });
  assertEquals(out.id, "vrsn_2");
});

Deno.test("template-version-create: is declared non-idempotent", () => {
  assertEquals(templateVersionCreate.idempotent, false);
});

Deno.test("template-version-create: a missing template surfaces not_found", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("not_found", "template not found", 404),
  }]);
  await assertRejects(
    async () => await templateVersionCreate.execute({ templateId: "tmpl_x", html: "x" }, ctx),
    Error,
    "not_found",
  );
});
