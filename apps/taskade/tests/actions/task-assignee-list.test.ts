import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/task-assignee-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("task-assignee-list: calls GET /projects/{projectId}/tasks/{taskId}/assignees", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, items: [{ id: "x1" }, { id: "x2" }] } }]);
  const out = await action.execute!(
    { "projectId": "projectId-1", "taskId": "taskId-1" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://www.taskade.com/api/v1/projects/projectId-1/tasks/taskId-1/assignees",
  );
  assertEquals(out.count, 2);
});

Deno.test("task-assignee-list: a failure envelope is an error", async () => {
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
