import { assertEquals, assertThrows } from "@std/assert";
import { asOptionalJson, compact, formatHexError, toList } from "../../lib/client.ts";

Deno.test("formatHexError: {code,message,issues} shape", () => {
  const m = formatHexError(
    400,
    "GET",
    "/api/v1/x",
    JSON.stringify({ code: "BAD_REQUEST", message: "Invalid", issues: [{ message: "limit" }] }),
    "tr1",
  );
  for (const s of ["400", "BAD_REQUEST", "Invalid", "limit", "tr1"]) {
    assertEquals(m.includes(s), true, s);
  }
});

Deno.test("formatHexError: {reason,details} shape", () => {
  const m = formatHexError(422, "DELETE", "/p", JSON.stringify({ reason: "R", details: "D" }));
  assertEquals(m.includes("R") && m.includes("D"), true);
});

Deno.test("formatHexError: plain text body and 429 hint", () => {
  assertEquals(formatHexError(401, "GET", "/p", "Unauthorized").includes("Unauthorized"), true);
  assertEquals(formatHexError(429, "GET", "/p", "{}").includes("retry"), true);
});

Deno.test("toList / compact / asOptionalJson", () => {
  assertEquals(toList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(compact({ a: 1, b: undefined, c: "", d: false }), { a: 1, d: false });
  assertEquals(asOptionalJson("[1]", "x"), [1]);
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertThrows(() => asOptionalJson("{", "x"), Error, "x is not valid JSON");
});
