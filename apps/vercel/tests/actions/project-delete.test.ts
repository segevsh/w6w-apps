import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-delete.ts";

test("project-delete: DELETEs and reports what went, since Vercel answers 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display: {} });
  const result = await action.execute!({ projectId: "my-app" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v9/projects/my-app");
  assertEquals(result, { id: "my-app", deleted: true });
});

test("project-delete: a blank project fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`projectId`");
  assertEquals(calls.length, 0);
});
