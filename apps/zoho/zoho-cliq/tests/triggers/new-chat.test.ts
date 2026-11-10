import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-chat.ts";

test("new-chat declares the chat-list poll contract", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals(trigger.key, "new-chat");
  assertEquals(trigger.sample, { id: "chat-101" });
});
