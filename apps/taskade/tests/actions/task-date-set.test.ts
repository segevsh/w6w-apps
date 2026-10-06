import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/task-date-set.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("task-date-set: calls PUT /projects/{projectId}/tasks/{taskId}/date", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, item: { id: "x1" } } }]);
  const out = await action.execute!({
    "projectId": "projectId-1",
    "taskId": "taskId-1",
    "startDate": "2026-10-07",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url,
    "https://www.taskade.com/api/v1/projects/projectId-1/tasks/taskId-1/date",
  );
  assertEquals(out.item, { id: "x1" });
  assert(calls[0].body !== null);
  assertEquals(typeof JSON.parse(calls[0].body!), "object");
  assertEquals(JSON.parse(calls[0].body!), { start: { date: "2026-10-07" } });
});

Deno.test("task-date-set: a failure envelope is an error", async () => {
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
      await action.execute!({
        "projectId": "projectId-1",
        "taskId": "taskId-1",
        "startDate": "2026-10-07",
      }, ctx),
    Error,
    "UNAUTHORIZED",
  );
});
