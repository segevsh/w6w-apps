import { assertEquals, assertRejects } from "@std/assert";
import followUpGet from "../../actions/follow-up-get.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "follow_up_id": "11111111-1111-4111-8111-111111111111" };
const RESPONSE = {
  "request_id": "r",
  "follow_up": {
    "id": "11111111-1111-4111-8111-111111111111",
    "content": "Ping Sam",
    "status": "pending",
    "task_id": "22222222-2222-4222-8222-222222222222",
    "project_id": null,
    "scheduled_for": "2026-01-31T09:00:00Z",
    "created_at": "2026-01-31T09:00:00Z",
    "updated_at": "2026-01-31T09:00:00Z",
  },
};

Deno.test("follow-up-get: GET /v2/follow-ups/{follow_up_id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await followUpGet.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/follow-ups/11111111-1111-4111-8111-111111111111");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://api.mem.ai/"), true);
  assertEquals(out.id, "11111111-1111-4111-8111-111111111111");
  assertEquals(out.status, "pending");
});

Deno.test("follow-up-get: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await followUpGet.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("follow-up-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      error_category: "CLIENT_ERROR",
      error_metadata: { error_kind: "NOT_FOUND", message: "no such thing" },
    },
  }]);
  const err = await assertRejects(() => Promise.resolve(followUpGet.execute(INPUT, ctx))) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("no such thing"), true);
});
