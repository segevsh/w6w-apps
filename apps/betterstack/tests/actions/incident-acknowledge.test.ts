import { assertEquals, assertRejects } from "@std/assert";
import incidentAcknowledge from "../../actions/incident-acknowledge.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("incident-acknowledge: POST /api/v3/incidents/{incident_id}/acknowledge", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": { "id": "25", "type": "incident", "attributes": { "status": "Acknowledged" } },
    },
  }]);
  const out = await incidentAcknowledge.execute({
    "incident_id": "25",
    "acknowledged_by": "elon@spacex.com",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/incidents/25/acknowledge");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "acknowledged_by": "elon@spacex.com" });
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.status, "Acknowledged");
});

Deno.test("incident-acknowledge: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": { "id": "25", "type": "incident", "attributes": { "status": "Acknowledged" } },
    },
  }]);
  await incidentAcknowledge.execute(
    { "incident_id": "25", "acknowledged_by": "elon@spacex.com" },
    ctx,
  );
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("incident-acknowledge: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await incidentAcknowledge.execute(
      { "incident_id": "25", "acknowledged_by": "elon@spacex.com" },
      ctx,
    )
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
