import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/delete-entry.ts";
import { API_ROOT, exec, mockCtx } from "../_helpers.ts";

Deno.test("delete-entry: DELETEs /v2/entries/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  assertEquals(await exec(action, { id: 5 }, ctx), { success: true });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/v2/entries/5`);
  assertEquals(calls[0].body, null);
});

Deno.test("delete-entry: a 403 surfaces and a bad id is refused", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { errors: [{ type: "Forbidden", message: "not yours" }] },
  }]);
  await assertRejects(() => exec(action, { id: 5 }, ctx), Error, "not yours");
  await assertRejects(() => exec(action, { id: "abc" }, mockCtx().ctx), Error, "positive integer");
});
