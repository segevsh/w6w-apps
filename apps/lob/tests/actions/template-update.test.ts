import { assertEquals, assertRejects } from "@std/assert";
import templateUpdate from "../../actions/template-update.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-update: POSTs only the supplied fields to the template", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tmpl_1" } }]);
  await templateUpdate.execute({ templateId: "tmpl_1", publishedVersion: "vrsn_2" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/templates/tmpl_1");
  assertEquals(bodyOf(calls[0]), { published_version: "vrsn_2" });
});

Deno.test("template-update: refuses an empty update", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await templateUpdate.execute({ templateId: "tmpl_1" }, ctx),
    Error,
    "description and/or",
  );
  assertEquals(calls.length, 0);
});

Deno.test("template-update: is declared idempotent", () => {
  assertEquals(templateUpdate.idempotent, true);
});

Deno.test("template-update: an unknown version surfaces Lob's code", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("not_found", "version not found", 404),
  }]);
  await assertRejects(
    async () => await templateUpdate.execute({ templateId: "tmpl_1", description: "d" }, ctx),
    Error,
    "not_found",
  );
});
