import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-customer.ts";
import { API_ROOT, exec, mockCtx } from "../_helpers.ts";

Deno.test("get-customer: GETs /v3/customers/{id} and returns the data member", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 4, name: "X" } } }]);
  const out = await exec(action, { id: "4" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/v3/customers/4`);
  assertEquals(out, { data: { id: 4, name: "X" } });
});

Deno.test("get-customer: a bad id is refused locally; a 400 surfaces the vendor message", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, { id: "-1" }, none.ctx), Error, "positive integer");
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{
    status: 400,
    body: { errors: [{ type: "General", message: "not found" }] },
  }]);
  await assertRejects(() => exec(action, { id: 4 }, ctx), Error, "not found");
});
