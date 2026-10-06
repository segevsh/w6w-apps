import { assertEquals, assertRejects } from "@std/assert";
import timeOffTypeCreate from "../../actions/time-off-type-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("time-off-type-create: POST /resource-planner/time-off-types with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await timeOffTypeCreate.execute(
    { "name": "Sick", "color": "#4babe5", "paid": true },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/resource-planner/time-off-types");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "Sick",
    "color": "#4babe5",
    "paid": true,
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("time-off-type-create: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        timeOffTypeCreate.execute({ "name": "Sick", "color": "#4babe5", "paid": true }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("time-off-type-create: declares perform and idempotent=false", () => {
  assertEquals(timeOffTypeCreate.type, "perform");
  assertEquals(timeOffTypeCreate.idempotent, false);
});
