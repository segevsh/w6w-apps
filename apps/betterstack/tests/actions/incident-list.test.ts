import { assertEquals, assertRejects } from "@std/assert";
import incidentList from "../../actions/incident-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("incident-list: GET /api/v3/incidents", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "101",
        "type": "incident",
        "attributes": { "name": "uptime homepage", "cause": "Status 404", "status": "Started" },
      }],
      "pagination": {
        "first": "https://incidents.betterstack.com/api/v3/incidents?page=1",
        "last": "https://incidents.betterstack.com/api/v3/incidents?page=3",
        "prev": null,
        "next": "https://incidents.betterstack.com/api/v3/incidents?page=2",
      },
    },
  }]);
  const out = await incidentList.execute(
    { "resolved": "false", "monitor_id": "2", "per_page": 10 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/incidents");
  assertEquals(queryOf(calls[0].url), { "resolved": "false", "monitor_id": "2", "per_page": "10" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.count, 1);
  assertEquals(out.hasMore, true);
  assertEquals(out.nextPage, 2);
  assertEquals((out.items as Array<Record<string, unknown>>)[0].id, "101");
  assertEquals((out.items as Array<Record<string, unknown>>)[0].name, "uptime homepage");
});

Deno.test("incident-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "101",
        "type": "incident",
        "attributes": { "name": "uptime homepage", "cause": "Status 404", "status": "Started" },
      }],
      "pagination": {
        "first": "https://incidents.betterstack.com/api/v3/incidents?page=1",
        "last": "https://incidents.betterstack.com/api/v3/incidents?page=3",
        "prev": null,
        "next": "https://incidents.betterstack.com/api/v3/incidents?page=2",
      },
    },
  }]);
  await incidentList.execute({ "resolved": "false", "monitor_id": "2", "per_page": 10 }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("incident-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await incidentList.execute({ "resolved": "false", "monitor_id": "2", "per_page": 10 }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
