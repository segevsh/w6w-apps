import { assertEquals, assertRejects } from "@std/assert";
import heartbeatGet from "../../actions/heartbeat-get.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("heartbeat-get: GET /api/v2/heartbeats/{heartbeat_id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "9",
        "type": "heartbeat",
        "attributes": {
          "name": "Nightly backup",
          "url": "https://uptime.betterstack.com/api/v1/heartbeat/abc123",
          "period": 86400,
          "status": "up",
        },
      },
    },
  }]);
  const out = await heartbeatGet.execute({ "heartbeat_id": "9" }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/heartbeats/9");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.name, "Nightly backup");
  assertEquals(out.url, "https://uptime.betterstack.com/api/v1/heartbeat/abc123");
});

Deno.test("heartbeat-get: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "9",
        "type": "heartbeat",
        "attributes": {
          "name": "Nightly backup",
          "url": "https://uptime.betterstack.com/api/v1/heartbeat/abc123",
          "period": 86400,
          "status": "up",
        },
      },
    },
  }]);
  await heartbeatGet.execute({ "heartbeat_id": "9" }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("heartbeat-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await heartbeatGet.execute({ "heartbeat_id": "9" }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
