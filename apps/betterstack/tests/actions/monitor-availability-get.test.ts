import { assertEquals, assertRejects } from "@std/assert";
import monitorAvailabilityGet from "../../actions/monitor-availability-get.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("monitor-availability-get: GET /api/v2/monitors/{monitor_id}/sla", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "42",
        "type": "monitor_sla",
        "attributes": { "availability": 99.98, "total_downtime": 600, "number_of_incidents": 3 },
      },
    },
  }]);
  const out = await monitorAvailabilityGet.execute({
    "monitor_id": "42",
    "from": "2026-09-01",
    "to": "2026-09-30",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/monitors/42/sla");
  assertEquals(queryOf(calls[0].url), { "from": "2026-09-01", "to": "2026-09-30" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.availability, 99.98);
  assertEquals(out.number_of_incidents, 3);
});

Deno.test("monitor-availability-get: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "42",
        "type": "monitor_sla",
        "attributes": { "availability": 99.98, "total_downtime": 600, "number_of_incidents": 3 },
      },
    },
  }]);
  await monitorAvailabilityGet.execute({
    "monitor_id": "42",
    "from": "2026-09-01",
    "to": "2026-09-30",
  }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("monitor-availability-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await monitorAvailabilityGet.execute(
      { "monitor_id": "42", "from": "2026-09-01", "to": "2026-09-30" },
      ctx,
    )
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
