import { assertEquals, assertRejects } from "@std/assert";
import allocationCreate from "../../actions/allocation-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("allocation-create: POST /allocations with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await allocationCreate.execute({
    "startDate": "2019-01-01",
    "endDate": "2019-12-31",
    "users": "79786,79787",
    "timeOffType": 16539,
    "days": 24,
    "accrualFrequency": "daily",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/allocations");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "startDate": "2019-01-01",
    "endDate": "2019-12-31",
    "users": [79786, 79787],
    "timeOffType": 16539,
    "days": 24,
    "accrualFrequency": "daily",
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("allocation-create: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        allocationCreate.execute({
          "startDate": "2019-01-01",
          "endDate": "2019-12-31",
          "users": "79786,79787",
          "timeOffType": 16539,
          "days": 24,
          "accrualFrequency": "daily",
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("allocation-create: declares perform and idempotent=false", () => {
  assertEquals(allocationCreate.type, "perform");
  assertEquals(allocationCreate.idempotent, false);
});
