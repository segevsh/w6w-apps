import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-invoice.ts";

test("new-invoice declares the invoice-list poll contract", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals(trigger.key, "new-invoice");
  assertEquals(trigger.sample, { id: "invoice-101" });
});
