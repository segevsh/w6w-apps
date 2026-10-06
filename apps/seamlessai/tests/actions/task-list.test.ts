import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-list.ts";

const RESPONSE = { "success": true, "data": [{ "taskId": "1" }] };

Deno.test("task-list: calls GET /api/client/v2/tasks and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({
    "campaignIdentifier": "camp-q4",
    "status": "TODO",
    "taskType": "call",
    "limit": 30,
    "offset": 60,
    "sortColumn": "dueAt",
    "sortOrder": "desc",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/tasks");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "campaignIdentifier": "camp-q4",
    "status": "TODO",
    "taskType": "call",
    "limit": "30",
    "offset": "60",
    "sortColumn": "dueAt",
    "sortOrder": "desc",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("task-list: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
});

Deno.test("task-list: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "campaignIdentifier": "camp-q4",
        "status": "TODO",
        "taskType": "call",
        "limit": 30,
        "offset": 60,
        "sortColumn": "dueAt",
        "sortOrder": "desc",
      }, ctx),
    Error,
    "insufficientCredits",
  );
});
