import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-contact.ts";

test("new-contact declares the contact-list poll contract", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals(trigger.key, "new-contact");
  assertEquals(trigger.sample, { ContactID: "contact-101" });
});
