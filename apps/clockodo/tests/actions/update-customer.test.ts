import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-customer.ts";
import { API_ROOT, bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("update-customer: PUTs only the given fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 3, active: false } } }]);
  const out = await exec(action, { id: 3, active: false, name: "New" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, `${API_ROOT}/v3/customers/3`);
  assertEquals(bodyOf(calls[0]), { name: "New", active: false });
  assertEquals(out.data.id, 3);
});

Deno.test("update-customer: no fields is refused locally", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, { id: 3 }, none.ctx), Error, "at least one");
  assertEquals(none.calls.length, 0);
});
