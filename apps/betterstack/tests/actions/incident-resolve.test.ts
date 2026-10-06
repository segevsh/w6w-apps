import { assertEquals, assertRejects } from "@std/assert";
import incidentResolve from "../../actions/incident-resolve.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("incident-resolve: POST /api/v3/incidents/{incident_id}/resolve", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "25", "type": "incident", "attributes": { "status": "Resolved" } } },
  }]);
  const out = await incidentResolve.execute({
    "incident_id": "25",
    "resolved_by": "elon@spacex.com",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/incidents/25/resolve");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "resolved_by": "elon@spacex.com" });
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.status, "Resolved");
});

Deno.test("incident-resolve: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "25", "type": "incident", "attributes": { "status": "Resolved" } } },
  }]);
  await incidentResolve.execute({ "incident_id": "25", "resolved_by": "elon@spacex.com" }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("incident-resolve: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await incidentResolve.execute({ "incident_id": "25", "resolved_by": "elon@spacex.com" }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
