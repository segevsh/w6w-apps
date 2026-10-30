import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/chat-get-administrators.ts";

test("chat-get-administrators: GETs getChatAdministrators and returns the list", async () => {
  const admins = [{ status: "creator", user: { id: 1 } }];
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: admins } }]);
  assertEquals(await action.execute({ chatId: "1" }, ctx), admins);
  assertEquals(new URL(calls[0].url).pathname, "/bot%7Btoken%7D/getChatAdministrators");
});
