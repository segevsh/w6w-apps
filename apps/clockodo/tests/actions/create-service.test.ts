import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-service.ts";
import { API_ROOT, bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("create-service: POSTs /v4/services", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 2, name: "Consulting" } } }]);
  const out = await exec(action, { name: "Consulting", active: true }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/v4/services`);
  assertEquals(bodyOf(calls[0]), { name: "Consulting", active: true });
  assertEquals(out, { data: { id: 2, name: "Consulting" } });
});

Deno.test("create-service: a missing name is refused locally", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, {}, none.ctx), Error, "name is required");
  assertEquals(none.calls.length, 0);
});
