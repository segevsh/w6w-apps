import { test } from "node:test";
import { assertEquals, assertExists } from "../_assert.ts";
import credits from "../../health/credits.ts";

test("credits: declared unavailable, no check hook, informational severity", () => {
  assertEquals(credits.check, undefined);
  assertExists(credits.unavailable);
  assertEquals(credits.severity, "informational");
  assertEquals(credits.kind, "quota");
});
