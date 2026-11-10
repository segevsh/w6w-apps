import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-request.ts";

test("new-request declares the request-list poll contract", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals(trigger.key, "new-request");
  assertEquals(trigger.sample, { request_id: "request-101" });
});
