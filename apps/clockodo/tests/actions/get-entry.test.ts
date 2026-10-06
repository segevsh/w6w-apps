import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-entry.ts";
import { API_ROOT, exec, mockCtx } from "../_helpers.ts";

Deno.test("get-entry: GETs /v2/entries/{id} and returns the entry", async () => {
  const { ctx, calls } = mockCtx([{ body: { entry: { id: 9, customers_id: 3 } } }]);
  const out = await exec(action, { id: "9" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/v2/entries/9`);
  assertEquals(out, { entry: { id: 9, customers_id: 3 } });
});

Deno.test("get-entry: a bad id never reaches the API; a 404 surfaces the vendor message", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, { id: "9/../x" }, none.ctx), Error, "positive integer");
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ type: "NotFound", message: "no such entry" }] },
  }]);
  await assertRejects(() => exec(action, { id: 99 }, ctx), Error, "no such entry");
});
