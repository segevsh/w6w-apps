import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-candidate.ts";

test("new-candidate declares the candidate-list poll contract", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals(trigger.key, "new-candidate");
  assertEquals(trigger.sample, { id: "candidate-101" });
});
