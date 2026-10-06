import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-get.ts";

Deno.test("template-get: GETs /document_templates/{id}", async () => {
  const body = { id: "t1", name: "NDA", placeholders: [{ id: "1", name: "Client" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await action.execute!({ id: "t1" }, ctx), body);
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/document_templates/t1");
  assertEquals(calls[0].method, "GET");
});

Deno.test("template-get: id is required", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ id: "  " }, ctx),
    Error,
    "`id` is required",
  );
});
