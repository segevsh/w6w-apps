import { assertEquals } from "@std/assert";
import { formatGladiaError, toList } from "../../lib/client.ts";

Deno.test("formatGladiaError: surfaces message and request_id", () => {
  const raw = JSON.stringify({
    statusCode: 401,
    message: "gladia user not found",
    request_id: "G-1",
  });
  const out = formatGladiaError(401, "GET", "/v2/pre-recorded", raw);
  assertEquals(out.includes("gladia user not found"), true);
  assertEquals(out.includes("G-1"), true);
});

Deno.test("formatGladiaError: non-JSON body and 429 hint", () => {
  const out = formatGladiaError(429, "POST", "/v2/pre-recorded", "slow down");
  assertEquals(out.includes("slow down"), true);
  assertEquals(out.includes("do not resubmit"), true);
});

Deno.test("formatGladiaError: array message is stringified", () => {
  const out = formatGladiaError(422, "POST", "/p", JSON.stringify({ message: ["a", "b"] }));
  assertEquals(out.includes('["a","b"]'), true);
});

Deno.test("toList: splits commas and newlines, drops blanks, passes arrays", () => {
  assertEquals(toList("a, b\nc,,"), ["a", "b", "c"]);
  assertEquals(toList(["x", " y "]), ["x", "y"]);
  assertEquals(toList(undefined), []);
  assertEquals(toList(""), []);
});
