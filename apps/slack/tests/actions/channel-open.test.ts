import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-open.ts";

test("channel-open: POSTs /conversations.open with users and return_im", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, channel: { id: "D1" } } }]);
  const result = await action.execute!({ users: "U1,U2", returnIm: true }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/conversations.open");
  assertEquals(JSON.parse(calls[0].body!), { users: "U1,U2", return_im: true });
  assertEquals(result, { id: "D1" });
});
