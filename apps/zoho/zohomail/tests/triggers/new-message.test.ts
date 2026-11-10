import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-message.ts";

test("new-message declares the message-list poll contract", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals(trigger.key, "new-message");
  assertEquals(trigger.sample, { messageId: "message-101" });
});
