import { assert, assertEquals, assertRejects } from "@std/assert";
import escalationPolicyList from "../../actions/escalation-policy-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("escalation-policy-list: GET /api/v3/policies", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "101",
        "type": "policy",
        "attributes": {
          "name": "Policy A",
          "repeat_count": 5,
          "incident_token": "tok_secret_value",
        },
      }],
      "pagination": {
        "first": "https://incidents.betterstack.com/api/v3/policies?page=1",
        "last": "https://incidents.betterstack.com/api/v3/policies?page=3",
        "prev": null,
        "next": "https://incidents.betterstack.com/api/v3/policies?page=2",
      },
    },
  }]);
  const out = await escalationPolicyList.execute({}, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/policies");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.count, 1);
  assertEquals(out.hasMore, true);
  assertEquals(out.nextPage, 2);
  assertEquals((out.items as Array<Record<string, unknown>>)[0].id, "101");
  assertEquals((out.items as Array<Record<string, unknown>>)[0].name, "Policy A");
  assert(!("incident_token" in (out.items as Array<Record<string, unknown>>)[0]));
});

Deno.test("escalation-policy-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "101",
        "type": "policy",
        "attributes": {
          "name": "Policy A",
          "repeat_count": 5,
          "incident_token": "tok_secret_value",
        },
      }],
      "pagination": {
        "first": "https://incidents.betterstack.com/api/v3/policies?page=1",
        "last": "https://incidents.betterstack.com/api/v3/policies?page=3",
        "prev": null,
        "next": "https://incidents.betterstack.com/api/v3/policies?page=2",
      },
    },
  }]);
  await escalationPolicyList.execute({}, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("escalation-policy-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () => await escalationPolicyList.execute({}, ctx)) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
