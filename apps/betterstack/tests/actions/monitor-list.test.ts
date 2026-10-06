import { assert, assertEquals, assertRejects } from "@std/assert";
import monitorList from "../../actions/monitor-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("monitor-list: GET /api/v2/monitors", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "101",
        "type": "monitor",
        "attributes": {
          "url": "https://example.com",
          "pronounceable_name": "Example",
          "status": "up",
          "auth_password": "hunter2",
          "proxy_host": "user:pass@proxy.example.com",
        },
      }],
      "pagination": {
        "first": "https://incidents.betterstack.com/api/v2/monitors?page=1",
        "last": "https://incidents.betterstack.com/api/v2/monitors?page=3",
        "prev": null,
        "next": "https://incidents.betterstack.com/api/v2/monitors?page=2",
      },
    },
  }]);
  const out = await monitorList.execute(
    { "url": "https://example.com", "per_page": 20 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/monitors");
  assertEquals(queryOf(calls[0].url), { "url": "https://example.com", "per_page": "20" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.count, 1);
  assertEquals(out.hasMore, true);
  assertEquals(out.nextPage, 2);
  assertEquals((out.items as Array<Record<string, unknown>>)[0].id, "101");
  assertEquals((out.items as Array<Record<string, unknown>>)[0].url, "https://example.com");
  assert(!("auth_password" in (out.items as Array<Record<string, unknown>>)[0]));
  assertEquals(
    (out.items as Array<Record<string, unknown>>)[0].proxy_host,
    "***@proxy.example.com",
  );
});

Deno.test("monitor-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "101",
        "type": "monitor",
        "attributes": {
          "url": "https://example.com",
          "pronounceable_name": "Example",
          "status": "up",
          "auth_password": "hunter2",
          "proxy_host": "user:pass@proxy.example.com",
        },
      }],
      "pagination": {
        "first": "https://incidents.betterstack.com/api/v2/monitors?page=1",
        "last": "https://incidents.betterstack.com/api/v2/monitors?page=3",
        "prev": null,
        "next": "https://incidents.betterstack.com/api/v2/monitors?page=2",
      },
    },
  }]);
  await monitorList.execute({ "url": "https://example.com", "per_page": 20 }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("monitor-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await monitorList.execute({ "url": "https://example.com", "per_page": 20 }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
