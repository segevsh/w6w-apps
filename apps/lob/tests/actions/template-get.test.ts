import { assert, assertEquals, assertRejects } from "@std/assert";
import templateGet from "../../actions/template-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-get: GETs the resource by id, path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tmpl_abc", object: "x" } }]);
  const out = await templateGet.execute({ templateId: " tmpl_abc " }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/templates/tmpl_abc");
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "tmpl_abc");
});

Deno.test("template-get: a slash in the id cannot change the route", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await templateGet.execute({ templateId: "tmpl_a/../b" }, ctx);
  assert(!pathOf(calls[0].url).includes("/../"));
});

Deno.test("template-get: a 404 reports Lob's not_found code", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("not_found", "not found", 404) }]);
  await assertRejects(
    async () => await templateGet.execute({ templateId: "tmpl_zzz" }, ctx),
    Error,
    "not_found",
  );
});
