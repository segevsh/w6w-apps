import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-delete.ts";

Deno.test("template-delete: DELETEs /document_templates/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ id: "t1" }, ctx), { id: "t1", deleted: true });
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/document_templates/t1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(action.idempotent, true);
});

Deno.test("template-delete: a 404 throws", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { message: "Not found", meta: { error: "record_not_found" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ id: "x" }, ctx),
    Error,
    "record_not_found",
  );
});
