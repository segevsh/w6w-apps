import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/project-restore.ts";
import { mockCtx } from "../_helpers.ts";

test("project-restore: calls POST /projects/{projectId}/restore", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, item: { id: "x1" } } }]);
  const out = await action.execute!({ "projectId": "projectId-1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://www.taskade.com/api/v1/projects/projectId-1/restore");
  assertEquals(out.item, { id: "x1" });
});

test("project-restore: a failure envelope is an error", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: {
        ok: false,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        statusMessage: "Unauthorized",
      },
    },
  ]);
  await assertRejects(
    async () => await action.execute!({ "projectId": "projectId-1" }, ctx),
    Error,
    "UNAUTHORIZED",
  );
});
