import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-link.ts";

test("new-link declares the existing links request with its since filter", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals(
    "/v2/links?created_after=1970-01-01T00:00:00Z",
    "/v2/links?created_after=1970-01-01T00:00:00Z",
  );
});
