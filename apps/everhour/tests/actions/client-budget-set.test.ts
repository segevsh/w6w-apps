import { assertEquals, assertRejects } from "@std/assert";
import clientBudgetSet from "../../actions/client-budget-set.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client-budget-set: PUT /clients/{clientId}/budget with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await clientBudgetSet.execute({
    "clientId": 107,
    "type": "money",
    "budget": 100000,
    "period": "monthly",
    "threshold": 80,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/clients/107/budget");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "type": "money",
    "budget": 100000,
    "period": "monthly",
    "threshold": 80,
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("client-budget-set: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        clientBudgetSet.execute({
          "clientId": 107,
          "type": "money",
          "budget": 100000,
          "period": "monthly",
          "threshold": 80,
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("client-budget-set: declares perform and idempotent=true", () => {
  assertEquals(clientBudgetSet.type, "perform");
  assertEquals(clientBudgetSet.idempotent, true);
});
