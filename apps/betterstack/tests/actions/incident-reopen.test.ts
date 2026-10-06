import { assertEquals, assertRejects } from "@std/assert";
import incidentReopen from "../../actions/incident-reopen.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("incident-reopen: POST /api/v3/incidents/{incident_id}/reopen", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "25", "type": "incident", "attributes": { "status": "Started" } } },
  }]);
  const out = await incidentReopen.execute({
    "incident_id": "25",
    "reopened_by": "elon@spacex.com",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/incidents/25/reopen");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "reopened_by": "elon@spacex.com" });
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.status, "Started");
});

Deno.test("incident-reopen: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "25", "type": "incident", "attributes": { "status": "Started" } } },
  }]);
  await incidentReopen.execute({ "incident_id": "25", "reopened_by": "elon@spacex.com" }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("incident-reopen: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await incidentReopen.execute({ "incident_id": "25", "reopened_by": "elon@spacex.com" }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
