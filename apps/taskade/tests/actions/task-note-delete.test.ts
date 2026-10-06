import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/task-note-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("task-note-delete: calls DELETE /projects/{projectId}/tasks/{taskId}/note", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!(
    { "projectId": "projectId-1", "taskId": "taskId-1" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    calls[0].url,
    "https://www.taskade.com/api/v1/projects/projectId-1/tasks/taskId-1/note",
  );
  assertEquals(out.ok, true);
});

Deno.test("task-note-delete: a failure envelope is an error", async () => {
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
    async () => await action.execute!({ "projectId": "projectId-1", "taskId": "taskId-1" }, ctx),
    Error,
    "UNAUTHORIZED",
  );
});
