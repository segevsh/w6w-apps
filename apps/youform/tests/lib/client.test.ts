import { assertEquals } from "@std/assert";
import { flag01, formatYouformError, truncate } from "../../lib/client.ts";

Deno.test("flag01: maps booleans to 1/0 and leaves unset absent", () => {
  assertEquals([flag01(true), flag01(false), flag01(undefined), flag01(null)], [
    "1",
    "0",
    undefined,
    undefined,
  ]);
});

Deno.test("formatYouformError: non-JSON bodies are kept, long ones truncated", () => {
  assertEquals(
    formatYouformError(502, "GET", "/api/me", "bad gateway"),
    "Youform 502 for GET /api/me: bad gateway",
  );
  assertEquals(truncate("x".repeat(700)).includes("700 bytes"), true);
});
