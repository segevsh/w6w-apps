import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-workbook.ts";

test("new-workbook declares the workbook-list poll contract", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals(trigger.key, "new-workbook");
  assertEquals(trigger.sample, { resource_id: "workbook-101" });
});
