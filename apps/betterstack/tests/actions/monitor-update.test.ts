import { assertEquals, assertRejects } from "@std/assert";
import monitorUpdate from "../../actions/monitor-update.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("monitor-update: PATCH /api/v2/monitors/{monitor_id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "42",
        "type": "monitor",
        "attributes": { "status": "paused", "paused_at": "2026-10-06T00:00:00.000Z" },
      },
    },
  }]);
  const out = await monitorUpdate.execute({
    "monitor_id": "42",
    "paused": true,
    "check_frequency": 120,
    "url": "",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/monitors/42");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "paused": true, "check_frequency": 120 });
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.status, "paused");
});

Deno.test("monitor-update: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "42",
        "type": "monitor",
        "attributes": { "status": "paused", "paused_at": "2026-10-06T00:00:00.000Z" },
      },
    },
  }]);
  await monitorUpdate.execute({
    "monitor_id": "42",
    "paused": true,
    "check_frequency": 120,
    "url": "",
  }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("monitor-update: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await monitorUpdate.execute(
      { "monitor_id": "42", "paused": true, "check_frequency": 120, "url": "" },
      ctx,
    )
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
