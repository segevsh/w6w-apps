import { assertEquals, assertRejects } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "status": "pending", "project_id": "22222222-2222-4222-8222-222222222222" };
const RESPONSE = {
  "request_id": "r",
  "results": [{
    "id": "11111111-1111-4111-8111-111111111111",
    "title": "Ship",
    "description": "d",
    "status": "pending",
    "due_at": null,
    "project_id": "22222222-2222-4222-8222-222222222222",
    "created_at": "2026-01-31T09:00:00Z",
    "updated_at": "2026-01-31T09:00:00Z",
  }],
  "total": 1,
};

Deno.test("task-list: GET /v2/tasks", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await taskList.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/tasks");
  assertEquals(queryOf(calls[0].url), {
    "status": "pending",
    "project_id": "22222222-2222-4222-8222-222222222222",
  });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://api.mem.ai/"), true);
  assertEquals((out.items as unknown[]).length, 1);
  assertEquals(out.total, 1);
});

Deno.test("task-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await taskList.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("task-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      error_category: "CLIENT_ERROR",
      error_metadata: { error_kind: "NOT_FOUND", message: "no such thing" },
    },
  }]);
  const err = await assertRejects(() => Promise.resolve(taskList.execute(INPUT, ctx))) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("no such thing"), true);
});
