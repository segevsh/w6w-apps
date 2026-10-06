import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

const RESPONSE = { "success": true, "data": { "taskId": "10" } };

Deno.test("task-create: calls POST /api/client/v2/tasks and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({
    "name": "Call Jane",
    "taskType": "call",
    "contactId": 11,
    "dueAt": "2026-10-10T15:00:00Z",
    "description": "Intro call",
    "priority": 2,
    "templateId": 4,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/tasks");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "Call Jane",
    "taskType": "call",
    "contactId": 11,
    "dueAt": "2026-10-10T15:00:00Z",
    "description": "Intro call",
    "priority": 2,
    "templateId": 4,
  });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("task-create: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "name": "Call Jane", "taskType": "call", "contactId": 11 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "Call Jane",
    "taskType": "call",
    "contactId": 11,
  });
});

Deno.test("task-create: refuses a missing name before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await action.execute!({ "taskType": "call", "contactId": 11 } as never, ctx)
  );
  assertEquals(calls.length, 0);
});

Deno.test("task-create: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "name": "Call Jane",
        "taskType": "call",
        "contactId": 11,
        "dueAt": "2026-10-10T15:00:00Z",
        "description": "Intro call",
        "priority": 2,
        "templateId": 4,
      }, ctx),
    Error,
    "insufficientCredits",
  );
});
