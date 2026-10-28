import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-delete.ts";

/** Deletion is a POST here, not a DELETE. */
Deno.test("template-delete: POSTs the delete path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await action.execute!({ templateId: "t1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/template/delete/t1");
  assertEquals(result, { template_id: "t1", deleted: true });
});

Deno.test("template-delete: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`templateId`");
  assertEquals(calls.length, 0);
});
