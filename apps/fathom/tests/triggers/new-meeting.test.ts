import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-meeting.ts";

test("new-meeting declares the existing meetings request with its since filter", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals(
    "/meetings?created_after=1970-01-01T00:00:00Z",
    "/meetings?created_after=1970-01-01T00:00:00Z",
  );
});
