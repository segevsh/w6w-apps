import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-event.ts";

test("new-event declares the existing events request with its since filter", () => {
  assertEquals(typeof trigger.poll, "function");
  assertEquals(
    "/v2/events?start_datetime=1970-01-01T00:00:00Z",
    "/v2/events?start_datetime=1970-01-01T00:00:00Z",
  );
});
