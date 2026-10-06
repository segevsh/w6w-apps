import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-update.ts";

const RESPONSE = { "success": true, "data": { "taskId": "9" } };

Deno.test("task-update: calls PUT /api/client/v2/tasks/{id} and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({
    "id": "9",
    "name": "Renamed",
    "dueAt": "2026-10-11T09:00:00Z",
    "description": "Updated",
    "priority": 1,
    "status": "COMPLETED",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/tasks/9");
  assertEquals(calls[0].method, "PUT");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "Renamed",
    "dueAt": "2026-10-11T09:00:00Z",
    "description": "Updated",
    "priority": 1,
    "status": "COMPLETED",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("task-update: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "id": "9" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("task-update: refuses a missing id before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({} as never, ctx));
  assertEquals(calls.length, 0);
});

Deno.test("task-update: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "id": "9",
        "name": "Renamed",
        "dueAt": "2026-10-11T09:00:00Z",
        "description": "Updated",
        "priority": 1,
        "status": "COMPLETED",
      }, ctx),
    Error,
    "insufficientCredits",
  );
});
