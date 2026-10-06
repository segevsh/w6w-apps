import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/task-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("task-list: calls GET /projects/{projectId}/tasks", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, items: [{ id: "x1" }, { id: "x2" }] } }]);
  const out = await action.execute!({ "projectId": "projectId-1", "limit": 2 }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://www.taskade.com/api/v1/projects/projectId-1/tasks?limit=2");
  assertEquals(out.count, 2);
  assertEquals(out.nextAfter, "x2");
});

Deno.test("task-list: a failure envelope is an error", async () => {
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
    async () => await action.execute!({ "projectId": "projectId-1", "limit": 2 }, ctx),
    Error,
    "UNAUTHORIZED",
  );
});

Deno.test("task-list: a short page has no nextAfter and cursors are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, items: [{ id: "x1" }] } }]);
  const out = await action.execute!({ projectId: "p1", limit: 5, after: "t9" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(out.nextAfter, null);
  assertEquals(calls[0].url, "https://www.taskade.com/api/v1/projects/p1/tasks?limit=5&after=t9");
});
