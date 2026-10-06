import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-project.ts";
import { API_ROOT, bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("update-project: PUTs only the given fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 8, active: false } } }]);
  const out = await exec(action, { id: 8, active: false, note: "n" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, `${API_ROOT}/v4/projects/8`);
  assertEquals(bodyOf(calls[0]), { active: false, note: "n" });
  assertEquals(out.data.id, 8);
});

Deno.test("update-project: no fields is refused locally", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, { id: 8 }, none.ctx), Error, "at least one");
  assertEquals(none.calls.length, 0);
});
