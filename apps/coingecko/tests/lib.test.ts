import { assertEquals } from "@std/assert";
import { bool, csv, errorDetail, num, str } from "../lib/client.ts";

Deno.test("errorDetail: reads all three vendor error shapes", () => {
  assertEquals(errorDetail('{"error":"Missing parameter vs_currencies"}'), {
    code: undefined,
    message: "Missing parameter vs_currencies",
  });
  assertEquals(errorDetail('{"status":{"error_code":10002,"error_message":"nope"}}'), {
    code: 10002,
    message: "nope",
  });
  assertEquals(errorDetail('{"error_code":10010,"status":{"error_message":"host"}}'), {
    code: 10010,
    message: "host",
  });
  assertEquals(errorDetail("<html>").message, "<html>");
  assertEquals(errorDetail("").message, "empty response");
});

Deno.test("coercers: csv/str/bool/num", () => {
  assertEquals(csv([" a ", "b", ""]), "a,b");
  assertEquals(csv("a, b"), "a,b");
  assertEquals(csv(""), undefined);
  assertEquals(str("  "), undefined);
  assertEquals(bool(false), false);
  assertEquals(bool(undefined), undefined);
  assertEquals(num("3"), 3);
  assertEquals(num("x"), undefined);
});
