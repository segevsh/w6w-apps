import { assertEquals, assertRejects } from "@std/assert";
import severityList from "../../actions/severity-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("severity-list: GET /api/v2/urgencies", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "101",
        "type": "urgency",
        "attributes": { "name": "High Severity", "call": true },
      }],
      "pagination": {
        "first": "https://incidents.betterstack.com/api/v2/urgencies?page=1",
        "last": "https://incidents.betterstack.com/api/v2/urgencies?page=3",
        "prev": null,
        "next": "https://incidents.betterstack.com/api/v2/urgencies?page=2",
      },
    },
  }]);
  const out = await severityList.execute({}, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/urgencies");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.count, 1);
  assertEquals(out.hasMore, true);
  assertEquals(out.nextPage, 2);
  assertEquals((out.items as Array<Record<string, unknown>>)[0].id, "101");
  assertEquals((out.items as Array<Record<string, unknown>>)[0].name, "High Severity");
});

Deno.test("severity-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "101",
        "type": "urgency",
        "attributes": { "name": "High Severity", "call": true },
      }],
      "pagination": {
        "first": "https://incidents.betterstack.com/api/v2/urgencies?page=1",
        "last": "https://incidents.betterstack.com/api/v2/urgencies?page=3",
        "prev": null,
        "next": "https://incidents.betterstack.com/api/v2/urgencies?page=2",
      },
    },
  }]);
  await severityList.execute({}, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("severity-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () => await severityList.execute({}, ctx)) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
