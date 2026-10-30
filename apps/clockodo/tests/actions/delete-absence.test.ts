import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/delete-absence.ts";
import { API_ROOT, exec, mockCtx } from "../_helpers.ts";

test("delete-absence: DELETEs /v4/absences/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  assertEquals(await exec(action, { id: 21 }, ctx), { success: true });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/v4/absences/21`);
});

test("delete-absence: a 422 surfaces and a bad id is refused", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { errors: [{ type: "Locked", message: "approved absences are locked" }] },
  }]);
  await assertRejects(() => exec(action, { id: 21 }, ctx), Error, "locked");
  await assertRejects(() => exec(action, { id: "" }, mockCtx().ctx), Error, "positive integer");
});
