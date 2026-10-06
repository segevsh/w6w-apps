import { assertEquals, assertRejects } from "@std/assert";
import projectBillingSet from "../../actions/project-billing-set.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-billing-set: PUT /projects/{projectId}/billing with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await projectBillingSet.execute({
    "projectId": "ev:1",
    "billing": '{"type":"hourly"}',
    "rate": { "type": "project_rate", "rate": 10000 },
    "budget": { "type": "money", "budget": 50000 },
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/projects/ev:1/billing");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "billing": { "type": "hourly" },
    "rate": { "type": "project_rate", "rate": 10000 },
    "budget": { "type": "money", "budget": 50000 },
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("project-billing-set: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        projectBillingSet.execute({
          "projectId": "ev:1",
          "billing": '{"type":"hourly"}',
          "rate": { "type": "project_rate", "rate": 10000 },
          "budget": { "type": "money", "budget": 50000 },
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("project-billing-set: declares perform and idempotent=true", () => {
  assertEquals(projectBillingSet.type, "perform");
  assertEquals(projectBillingSet.idempotent, true);
});
