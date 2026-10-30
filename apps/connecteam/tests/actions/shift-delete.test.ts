import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import shiftDelete from "../../actions/shift-delete.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("shift-delete: DELETEs with a {shiftsIds} body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ shiftsIds: ["sh_1", "sh_2"] }) }]);
  const out = await shiftDelete.execute({ schedulerId: 10, shiftIds: "sh_1,sh_2" }, ctx);
  assertEquals(pathOf(calls[0].url), "/scheduler/v2/schedulers/10/shifts");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), { shiftsIds: ["sh_1", "sh_2"] });
  assertEquals(out, { shiftsIds: ["sh_1", "sh_2"] });
});

test("shift-delete: refuses to call the API with no ids", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => {
    await shiftDelete.execute({ schedulerId: 10, shiftIds: "" }, ctx);
  });
  assertEquals(calls.length, 0);
});

test("shift-delete: idempotent", () => {
  assertEquals(shiftDelete.idempotent, true);
});
