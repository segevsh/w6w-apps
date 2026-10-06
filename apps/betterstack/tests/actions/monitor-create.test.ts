import { assertEquals, assertRejects } from "@std/assert";
import monitorCreate from "../../actions/monitor-create.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("monitor-create: POST /api/v2/monitors", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      "data": {
        "id": "7",
        "type": "monitor",
        "attributes": {
          "url": "https://example.com",
          "status": "pending",
          "monitor_type": "expected_status_code",
        },
      },
    },
  }]);
  const out = await monitorCreate.execute({
    "monitor_type": "expected_status_code",
    "url": "https://example.com",
    "check_frequency": 60,
    "expected_status_codes": "[200, 301]",
    "regions": ["eu", "us"],
    "paused": false,
    "team_name": "Prod",
    "request_body": "",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/monitors");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "team_name": "Prod",
    "monitor_type": "expected_status_code",
    "url": "https://example.com",
    "check_frequency": 60,
    "expected_status_codes": [200, 301],
    "regions": ["eu", "us"],
    "paused": false,
  });
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.id, "7");
  assertEquals(out.status, "pending");
});

Deno.test("monitor-create: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      "data": {
        "id": "7",
        "type": "monitor",
        "attributes": {
          "url": "https://example.com",
          "status": "pending",
          "monitor_type": "expected_status_code",
        },
      },
    },
  }]);
  await monitorCreate.execute({
    "monitor_type": "expected_status_code",
    "url": "https://example.com",
    "check_frequency": 60,
    "expected_status_codes": "[200, 301]",
    "regions": ["eu", "us"],
    "paused": false,
    "team_name": "Prod",
    "request_body": "",
  }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("monitor-create: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await monitorCreate.execute({
      "monitor_type": "expected_status_code",
      "url": "https://example.com",
      "check_frequency": 60,
      "expected_status_codes": "[200, 301]",
      "regions": ["eu", "us"],
      "paused": false,
      "team_name": "Prod",
      "request_body": "",
    }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
