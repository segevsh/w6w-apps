import { assertEquals, assertRejects } from "@std/assert";
import taskEstimateSet from "../../actions/task-estimate-set.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-estimate-set: PUT /tasks/{taskId}/estimate with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await taskEstimateSet.execute({
    "taskId": "ev:9",
    "total": 7200,
    "type": "users",
    "users": '{"1304":3600,"1543":3600}',
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/tasks/ev:9/estimate");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "total": 7200,
    "type": "users",
    "users": { "1304": 3600, "1543": 3600 },
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("task-estimate-set: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        taskEstimateSet.execute({
          "taskId": "ev:9",
          "total": 7200,
          "type": "users",
          "users": '{"1304":3600,"1543":3600}',
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("task-estimate-set: declares perform and idempotent=true", () => {
  assertEquals(taskEstimateSet.type, "perform");
  assertEquals(taskEstimateSet.idempotent, true);
});
