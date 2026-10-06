import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-list.ts";
import { exec, mockCtx } from "../_helpers.ts";

Deno.test("get-list: GETs /api/lists/{id} and returns the data member", async () => {
  const data = { id: 12, name: "L", status: "finished", stats: { people: 3 } };
  const { ctx, calls } = mockCtx([{ body: { status: { code: 200 }, type: "list", data } }]);
  const out = await exec(action, { id: 12 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://wiza.co/api/lists/12");
  assertEquals(out, data);
});

Deno.test("get-list: the flat 404 envelope fails with its message; a bad id never reaches the API", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, message: "List not found" } }]);
  await assertRejects(() => exec(action, { id: 99 }, ctx), Error, "List not found");
  const none = mockCtx();
  await assertRejects(() => exec(action, { id: "12/contacts" }, none.ctx), Error, "numeric");
  assertEquals(none.calls.length, 0);
});
