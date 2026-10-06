import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/task-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("task-create: calls POST /projects/{projectId}/tasks/", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, item: [{ id: "t1", text: "Buy milk" }] } }]);
  const out = await action.execute!(
    { "projectId": "projectId-1", "content": "Buy milk" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://www.taskade.com/api/v1/projects/projectId-1/tasks/");
  assertEquals((out.task as { id: string }).id, "t1");
  assertEquals(JSON.parse(calls[0].body!), {
    tasks: [{ contentType: "text/markdown", content: "Buy milk", placement: "beforeend" }],
  });
});

Deno.test("task-create: a failure envelope is an error", async () => {
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
    async () => await action.execute!({ "projectId": "projectId-1", "content": "Buy milk" }, ctx),
    Error,
    "UNAUTHORIZED",
  );
});

Deno.test("task-create: a reference task is sent as taskId", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, item: [{ id: "t2" }] } }]);
  await action.execute!(
    { projectId: "p1", content: "Sub", placement: "afterend", referenceTaskId: "t1" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).tasks[0], {
    contentType: "text/markdown",
    content: "Sub",
    placement: "afterend",
    taskId: "t1",
  });
});

Deno.test("task-create: before/after placement without a reference is refused locally", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!({ projectId: "p1", content: "x", placement: "beforebegin" }, ctx),
    Error,
    "Reference task ID",
  );
  assertEquals(calls.length, 0);
});
