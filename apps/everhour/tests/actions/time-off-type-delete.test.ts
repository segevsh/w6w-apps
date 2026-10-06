import { assertEquals, assertRejects } from "@std/assert";
import timeOffTypeDelete from "../../actions/time-off-type-delete.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("time-off-type-delete: DELETE /resource-planner/time-off-types/{typeId} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await timeOffTypeDelete.execute({ "typeId": 16539 }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/resource-planner/time-off-types/16539");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "ok": true });
});

Deno.test("time-off-type-delete: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () => Promise.resolve(timeOffTypeDelete.execute({ "typeId": 16539 }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("time-off-type-delete: declares perform and idempotent=true", () => {
  assertEquals(timeOffTypeDelete.type, "perform");
  assertEquals(timeOffTypeDelete.idempotent, true);
});
