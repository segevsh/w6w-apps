import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/task-note-set.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("task-note-set: calls PUT /projects/{projectId}/tasks/{taskId}/note", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, item: { id: "x1" } } }]);
  const out = await action.execute!({
    "projectId": "projectId-1",
    "taskId": "taskId-1",
    "value": "note",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url,
    "https://www.taskade.com/api/v1/projects/projectId-1/tasks/taskId-1/note",
  );
  assertEquals(out.item, { id: "x1" });
  assert(calls[0].body !== null);
  assertEquals(typeof JSON.parse(calls[0].body!), "object");
});

Deno.test("task-note-set: a failure envelope is an error", async () => {
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
    async () =>
      await action.execute!(
        { "projectId": "projectId-1", "taskId": "taskId-1", "value": "note" },
        ctx,
      ),
    Error,
    "UNAUTHORIZED",
  );
});
