import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/task-complete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("task-complete: calls POST /projects/{projectId}/tasks/{taskId}/complete", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, item: { id: "x1" } } }]);
  const out = await action.execute!(
    { "projectId": "projectId-1", "taskId": "taskId-1" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://www.taskade.com/api/v1/projects/projectId-1/tasks/taskId-1/complete",
  );
  assertEquals(out.item, { id: "x1" });
});

Deno.test("task-complete: a failure envelope is an error", async () => {
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
