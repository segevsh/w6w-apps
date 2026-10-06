import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/cancel-task.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("cancel-task: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await run(action, { "taskId": "11111111-1111-4111-8111-111111111111" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    calls[0].url,
    "https://api.dev.runwayml.com/v1/tasks/11111111-1111-4111-8111-111111111111",
  );
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(calls[0].body, null);
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "taskId": "11111111-1111-4111-8111-111111111111",
  });
});

Deno.test("cancel-task: a 401 surfaces Runway's error text", async () => {
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

Deno.test("cancel-task: a missing id is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(() => run(action, { taskId: " " }, ctx), Error, "taskId is required");
  assertEquals(calls.length, 0);
});
