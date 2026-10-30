import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/chat-set-title.ts";

test("chat-set-title: POSTs setChatTitle", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  await action.execute({ chatId: "1", title: "New name" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", title: "New name" });
});

test("chat-set-title: bounds the title to Telegram's 1-128 char limit", () => {
  assertEquals(action.params?.find((p) => p.key === "title")?.validation, {
    minLength: 1,
    maxLength: 128,
  });
});
