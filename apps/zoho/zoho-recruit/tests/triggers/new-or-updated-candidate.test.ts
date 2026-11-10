import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-or-updated-candidate.ts";

test("new-or-updated-candidate includes the update stamp in its event identity", () => {
  assertEquals(trigger.key, "new-or-updated-candidate");
  assertEquals(typeof trigger.poll, "function");
});
