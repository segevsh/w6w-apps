import { assertEquals, assertRejects } from "@std/assert";
import timeOffTypeUpdate from "../../actions/time-off-type-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("time-off-type-update: PUT /resource-planner/time-off-types/{typeId} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await timeOffTypeUpdate.execute({ "typeId": 16539, "name": "Sick leave" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/resource-planner/time-off-types/16539");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "name": "Sick leave" });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("time-off-type-update: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(timeOffTypeUpdate.execute({ "typeId": 16539, "name": "Sick leave" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("time-off-type-update: declares perform and idempotent=true", () => {
  assertEquals(timeOffTypeUpdate.type, "perform");
  assertEquals(timeOffTypeUpdate.idempotent, true);
});
