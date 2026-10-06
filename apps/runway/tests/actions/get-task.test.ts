import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-task.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-task: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "id": "11111111-1111-4111-8111-111111111111",
      "status": "SUCCEEDED",
      "createdAt": "2026-10-06T10:00:00Z",
      "output": ["https://cdn.test/o.mp4"],
      "cost": { "credits": 50 },
    },
  }]);
  const out = await run(action, { "taskId": "11111111-1111-4111-8111-111111111111" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.dev.runwayml.com/v1/tasks/11111111-1111-4111-8111-111111111111",
  );
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(calls[0].body, null);
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "id": "11111111-1111-4111-8111-111111111111",
    "status": "SUCCEEDED",
    "done": true,
    "output": ["https://cdn.test/o.mp4"],
    "costCredits": 50,
    "createdAt": "2026-10-06T10:00:00Z",
  });
});

Deno.test("get-task: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () => run(action, { "taskId": "11111111-1111-4111-8111-111111111111" }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});

Deno.test("get-task: RUNNING is not done; FAILED carries the failure code", async () => {
  const running = mockCtx([{
    body: { id: "t", status: "RUNNING", progress: 0.4, estimatedCost: { credits: 20 } },
  }]);
  const r = await run(action, { taskId: "t" }, running.ctx);
  assertEquals([r.done, r.progress, r.estimatedCostCredits], [false, 0.4, 20]);
  const failed = mockCtx([{
    body: {
      id: "t",
      status: "FAILED",
      failure: "moderated",
      failureCode: "SAFETY.INPUT.TEXT",
      cost: { credits: 5 },
    },
  }]);
  const f = await run(action, { taskId: "t" }, failed.ctx);
  assertEquals([f.done, f.failure, f.failureCode, f.costCredits], [
    true,
    "moderated",
    "SAFETY.INPUT.TEXT",
    5,
  ]);
});
