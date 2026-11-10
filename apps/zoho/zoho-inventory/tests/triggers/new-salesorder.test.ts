import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-salesorder.ts";

test("new-salesorder declares the salesorder-list poll contract", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals(trigger.key, "new-salesorder");
  assertEquals(trigger.sample, { salesorder_id: "salesorder-101" });
});
