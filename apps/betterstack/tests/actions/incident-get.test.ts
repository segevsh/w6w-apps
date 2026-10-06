import { assertEquals, assertRejects } from "@std/assert";
import incidentGet from "../../actions/incident-get.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("incident-get: GET /api/v3/incidents/{incident_id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "25",
        "type": "incident",
        "attributes": { "name": "uptime homepage", "status": "Started", "cause": "Status 404" },
        "relationships": { "monitor": { "data": { "id": "2", "type": "monitor" } } },
      },
    },
  }]);
  const out = await incidentGet.execute({ "incident_id": "25" }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/incidents/25");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.status, "Started");
  assertEquals((out.relationships as Record<string, { id: string }>).monitor.id, "2");
});

Deno.test("incident-get: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "25",
        "type": "incident",
        "attributes": { "name": "uptime homepage", "status": "Started", "cause": "Status 404" },
        "relationships": { "monitor": { "data": { "id": "2", "type": "monitor" } } },
      },
    },
  }]);
  await incidentGet.execute({ "incident_id": "25" }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("incident-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await await incidentGet.execute({ "incident_id": "25" }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
