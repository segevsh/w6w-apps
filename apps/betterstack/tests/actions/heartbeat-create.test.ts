import { assertEquals, assertRejects } from "@std/assert";
import heartbeatCreate from "../../actions/heartbeat-create.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("heartbeat-create: POST /api/v2/heartbeats", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      "data": {
        "id": "9",
        "type": "heartbeat",
        "attributes": {
          "name": "Nightly backup",
          "url": "https://uptime.betterstack.com/api/v1/heartbeat/abc123",
          "status": "pending",
        },
      },
    },
  }]);
  const out = await heartbeatCreate.execute({
    "name": "Nightly backup",
    "period": 86400,
    "grace": 600,
    "maintenance_days": ["sat"],
    "team_name": "Prod",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/heartbeats");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "team_name": "Prod",
    "name": "Nightly backup",
    "period": 86400,
    "grace": 600,
    "maintenance_days": ["sat"],
  });
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.id, "9");
  assertEquals(out.status, "pending");
});

Deno.test("heartbeat-create: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      "data": {
        "id": "9",
        "type": "heartbeat",
        "attributes": {
          "name": "Nightly backup",
          "url": "https://uptime.betterstack.com/api/v1/heartbeat/abc123",
          "status": "pending",
        },
      },
    },
  }]);
  await heartbeatCreate.execute({
    "name": "Nightly backup",
    "period": 86400,
    "grace": 600,
    "maintenance_days": ["sat"],
    "team_name": "Prod",
  }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("heartbeat-create: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await heartbeatCreate.execute({
      "name": "Nightly backup",
      "period": 86400,
      "grace": 600,
      "maintenance_days": ["sat"],
      "team_name": "Prod",
    }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
