import { assertEquals, assertRejects } from "@std/assert";
import taskUpdate from "../../actions/task-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-update: PUT /tasks/{taskId} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await taskUpdate.execute({
    "taskId": "ev:9",
    "name": "Write more docs",
    "section": 1234,
    "status": "closed",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/tasks/ev:9");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "Write more docs",
    "section": 1234,
    "status": "closed",
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("task-update: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        taskUpdate.execute({
          "taskId": "ev:9",
          "name": "Write more docs",
          "section": 1234,
          "status": "closed",
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("task-update: declares perform and idempotent=true", () => {
  assertEquals(taskUpdate.type, "perform");
  assertEquals(taskUpdate.idempotent, true);
});
