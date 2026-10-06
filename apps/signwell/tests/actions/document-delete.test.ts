import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-delete.ts";

Deno.test("document-delete: DELETEs /documents/{id} and reports deleted on a 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ id: "d1" }, ctx);
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/documents/d1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { id: "d1", deleted: true });
  assertEquals(action.idempotent, true);
});

Deno.test("document-delete: a 404 throws instead of reporting deleted", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { message: "Not found", meta: { error: "record_not_found" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ id: "gone" }, ctx),
    Error,
    "record_not_found",
  );
});
