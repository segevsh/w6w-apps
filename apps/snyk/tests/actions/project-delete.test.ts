import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-delete.ts";

Deno.test("project-delete: DELETEs and reports what went", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display: { orgId: "org-1" } });
  const result = await action.execute!({ projectId: "p1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { id: "p1", deleted: true });
});

Deno.test("project-delete: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: { orgId: "org-1" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`projectId`");
  assertEquals(calls.length, 0);
});
