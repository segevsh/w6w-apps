import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-conversation-message.ts";

test("new-conversation-message: poll trigger declares an executable output and sample", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals((trigger.output?.length ?? 0) > 0, true);
  assertEquals(trigger.sample !== undefined, true);
});
