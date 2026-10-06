import { assertEquals, assertThrows } from "@std/assert";
import { chartBody, chartConfig, jsonValue } from "../../lib/params.ts";
import { compact, errorText, fromBase64, toBase64 } from "../../lib/client.ts";

Deno.test("chartConfig: JSON text becomes an object, JS text stays a string, objects pass through", () => {
  assertEquals(chartConfig('{"type":"bar"}'), { type: "bar" });
  assertEquals(chartConfig("{type:'bar'}"), "{type:'bar'}");
  const o = { type: "pie" };
  assertEquals(chartConfig(o), o);
});

Deno.test("chartBody: omits unset fields so vendor defaults apply", () => {
  assertEquals(chartBody({ chart: "{}", width: 100, backgroundColor: "" }), {
    chart: {},
    width: 100,
  });
});

Deno.test("jsonValue: rejects invalid JSON with the field name", () => {
  assertThrows(() => jsonValue("data", "{x"), Error, "data must be valid JSON");
});

Deno.test("compact, base64 and errorText helpers", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: false }), { a: 1, e: false });
  assertEquals([...fromBase64(toBase64(new Uint8Array([0, 255, 7])))], [0, 255, 7]);
  assertEquals(errorText("header msg", "ignored"), "header msg");
  assertEquals(errorText(null, '{"errors":["a","b"]}'), "a; b");
  assertEquals(errorText(null, '{"error":"nope"}'), "nope");
  assertEquals(errorText(null, "\u0000\u0001binary"), "");
});
