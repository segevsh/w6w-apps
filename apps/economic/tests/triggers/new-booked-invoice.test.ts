import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-booked-invoice.ts";

test("new-booked-invoice declares the existing sorted invoice request", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals("/booked-invoices?sort=date%20desc", "/booked-invoices?sort=date%20desc");
});
