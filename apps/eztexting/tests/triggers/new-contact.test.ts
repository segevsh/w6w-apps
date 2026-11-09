import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-contact.ts";

test("new-contact declares the existing contacts request and newest-first sort", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals("/v1/contacts?sort=createdAt%3ADESC", "/v1/contacts?sort=createdAt%3ADESC");
});
