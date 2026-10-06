import { assertEquals, assertRejects } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-create: POST /projects/{projectId}/tasks with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await taskCreate.execute({
    "projectId": "ev:1",
    "name": "Write docs",
    "section": 1234,
    "labels": "high,bug",
    "dueOn": "2018-03-05",
    "assignees": "128,129",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/projects/ev:1/tasks");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "Write docs",
    "section": 1234,
    "labels": ["high", "bug"],
    "dueOn": "2018-03-05",
    "assignees": [{ "userId": 128 }, { "userId": 129 }],
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("task-create: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        taskCreate.execute({
          "projectId": "ev:1",
          "name": "Write docs",
          "section": 1234,
          "labels": "high,bug",
          "dueOn": "2018-03-05",
          "assignees": "128,129",
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("task-create: declares perform and idempotent=false", () => {
  assertEquals(taskCreate.type, "perform");
  assertEquals(taskCreate.idempotent, false);
});
