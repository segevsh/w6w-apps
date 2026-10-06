import { assertEquals, assertRejects } from "@std/assert";
import incidentCreate from "../../actions/incident-create.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("incident-create: POST /api/v3/incidents", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      "data": {
        "id": "88",
        "type": "incident",
        "attributes": { "name": "DB failover", "status": "Started" },
      },
    },
  }]);
  const out = await incidentCreate.execute({
    "requester_email": "ops@example.com",
    "summary": "DB failover",
    "email": true,
    "metadata": '{"Service": "billing"}',
    "description": "",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/incidents");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "requester_email": "ops@example.com",
    "summary": "DB failover",
    "email": true,
    "metadata": { "Service": "billing" },
  });
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.id, "88");
});

Deno.test("incident-create: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      "data": {
        "id": "88",
        "type": "incident",
        "attributes": { "name": "DB failover", "status": "Started" },
      },
    },
  }]);
  await incidentCreate.execute({
    "requester_email": "ops@example.com",
    "summary": "DB failover",
    "email": true,
    "metadata": '{"Service": "billing"}',
    "description": "",
  }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("incident-create: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await incidentCreate.execute({
      "requester_email": "ops@example.com",
      "summary": "DB failover",
      "email": true,
      "metadata": '{"Service": "billing"}',
      "description": "",
    }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
