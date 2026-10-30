import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/update-absence.ts";
import { API_ROOT, bodyOf, exec, mockCtx } from "../_helpers.ts";

test("update-absence: PUTs only the given fields (status as a number)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 21, status: 1 } } }]);
  const out = await exec(action, { id: 21, status: "1" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, `${API_ROOT}/v4/absences/21`);
  assertEquals(bodyOf(calls[0]), { status: 1 });
  assertEquals(out.data.status, 1);
});

test("update-absence: no fields is refused locally", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, { id: 21 }, none.ctx), Error, "at least one");
  assertEquals(none.calls.length, 0);
});
