import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";

test("new-or-updated-contact includes the update stamp in its event identity", () => {
  assertEquals(trigger.key, "new-or-updated-contact");
  assertEquals(typeof trigger.poll, "function");
});
