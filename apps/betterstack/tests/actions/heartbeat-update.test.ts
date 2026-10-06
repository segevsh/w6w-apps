import { assertEquals, assertRejects } from "@std/assert";
import heartbeatUpdate from "../../actions/heartbeat-update.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("heartbeat-update: PATCH /api/v2/heartbeats/{heartbeat_id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": { "id": "9", "type": "heartbeat", "attributes": { "status": "up", "period": 3600 } },
    },
  }]);
  const out = await heartbeatUpdate.execute({
    "heartbeat_id": "9",
    "period": 3600,
    "grace": 300,
    "name": "",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/heartbeats/9");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "period": 3600, "grace": 300 });
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.period, 3600);
});

Deno.test("heartbeat-update: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": { "id": "9", "type": "heartbeat", "attributes": { "status": "up", "period": 3600 } },
    },
  }]);
  await heartbeatUpdate.execute(
    { "heartbeat_id": "9", "period": 3600, "grace": 300, "name": "" },
    ctx,
  );
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("heartbeat-update: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await heartbeatUpdate.execute(
      { "heartbeat_id": "9", "period": 3600, "grace": 300, "name": "" },
      ctx,
    )
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
