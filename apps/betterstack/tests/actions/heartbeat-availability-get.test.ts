import { assertEquals, assertRejects } from "@std/assert";
import heartbeatAvailabilityGet from "../../actions/heartbeat-availability-get.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("heartbeat-availability-get: GET /api/v2/heartbeats/{heartbeat_id}/availability", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "9",
        "type": "heartbeat_availability",
        "attributes": { "availability": 99.9, "total_downtime": 335, "number_of_incidents": 5 },
      },
    },
  }]);
  const out = await heartbeatAvailabilityGet.execute(
    { "heartbeat_id": "9", "from": "2026-09-01" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/heartbeats/9/availability");
  assertEquals(queryOf(calls[0].url), { "from": "2026-09-01" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.availability, 99.9);
});

Deno.test("heartbeat-availability-get: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "9",
        "type": "heartbeat_availability",
        "attributes": { "availability": 99.9, "total_downtime": 335, "number_of_incidents": 5 },
      },
    },
  }]);
  await heartbeatAvailabilityGet.execute({ "heartbeat_id": "9", "from": "2026-09-01" }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("heartbeat-availability-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await heartbeatAvailabilityGet.execute({ "heartbeat_id": "9", "from": "2026-09-01" }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
