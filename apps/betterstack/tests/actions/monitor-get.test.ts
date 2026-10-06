import { assertEquals, assertRejects } from "@std/assert";
import monitorGet from "../../actions/monitor-get.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("monitor-get: GET /api/v2/monitors/{monitor_id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "42",
        "type": "monitor",
        "attributes": {
          "url": "https://example.com",
          "status": "up",
          "proxy_host": "https://bob:secret@proxy.example.com:8080",
          "environment_variables": { "PASSWORD": "passw0rd" },
          "request_headers": [{ "id": "1", "name": "Authorization", "value": "Bearer abc" }, {
            "id": "2",
            "name": "Accept",
            "value": "text/html",
          }],
        },
      },
    },
  }]);
  const out = await monitorGet.execute({ "monitor_id": "42" }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/monitors/42");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.id, "42");
  assertEquals(out.status, "up");
  assertEquals(out.proxy_host, "https://***@proxy.example.com:8080");
  assertEquals(out.environment_variables, { PASSWORD: "[redacted]" });
  assertEquals((out.request_headers as Array<Record<string, unknown>>)[0].value, "[redacted]");
  assertEquals((out.request_headers as Array<Record<string, unknown>>)[1].value, "text/html");
});

Deno.test("monitor-get: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "42",
        "type": "monitor",
        "attributes": {
          "url": "https://example.com",
          "status": "up",
          "proxy_host": "https://bob:secret@proxy.example.com:8080",
          "environment_variables": { "PASSWORD": "passw0rd" },
          "request_headers": [{ "id": "1", "name": "Authorization", "value": "Bearer abc" }, {
            "id": "2",
            "name": "Accept",
            "value": "text/html",
          }],
        },
      },
    },
  }]);
  await monitorGet.execute({ "monitor_id": "42" }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("monitor-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await await monitorGet.execute({ "monitor_id": "42" }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
