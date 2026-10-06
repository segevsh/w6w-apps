import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  base64ToBytes,
  buildMultipart,
  compact,
  cursorOf,
  formatPlacidError,
  looseValue,
  toList,
  toPage,
} from "../lib/client.ts";

Deno.test("compact keeps false and 0, drops unset", () => {
  assertEquals(compact({ a: false, b: 0, c: "", d: undefined, e: null, f: "x" }), {
    a: false,
    b: 0,
    f: "x",
  });
});

Deno.test("asOptionalJson parses strings, passes objects, rejects junk", () => {
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson("", "x"), undefined);
  assertThrows(() => asOptionalJson("{nope", "layers"), Error, "layers is not valid JSON");
});

Deno.test("looseValue: arrays parse, plain strings stay strings", () => {
  assertEquals(looseValue('["a","b"]'), ["a", "b"]);
  assertEquals(looseValue("order-9"), "order-9");
  assertEquals(looseValue("[not json"), "[not json");
  assertEquals(looseValue(""), undefined);
});

Deno.test("toList splits and trims", () => {
  assertEquals(toList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList([]), undefined);
});

Deno.test("cursorOf and toPage read links.next", () => {
  const next = "https://api.placid.app/api/rest/templates?cursor=abc%3D";
  assertEquals(cursorOf(next), "abc=");
  assertEquals(cursorOf(null), null);
  const p = toPage({ data: [1], links: { next, prev: null }, meta: { per_page: 20 } });
  assertEquals(p, { data: [1], nextCursor: "abc=", prevCursor: null, perPage: 20 });
  assertEquals(toPage([1, 2]).data, [1, 2]);
});

Deno.test("formatPlacidError: message, validation errors and a hint", () => {
  const m = formatPlacidError(
    422,
    "POST",
    "/images",
    JSON.stringify({
      message: "The given data was invalid.",
      errors: { template_uuid: ["required"] },
    }),
  );
  assert(m.includes("422"));
  assert(m.includes("template_uuid: required"));
  assert(m.includes("validation failed"));
  assert(formatPlacidError(500, "GET", "/x", "<html>").includes("<html>"));
});

Deno.test("buildMultipart frames fields, files and the closing boundary", () => {
  const { body, contentType } = buildMultipart({ title: "T" }, [{
    field: "file",
    filename: 'a"b.png',
    contentType: "image/png",
    bytes: new Uint8Array([1, 2, 3]),
  }]);
  const boundary = contentType.split("boundary=")[1];
  const text = new TextDecoder().decode(body);
  assert(
    text.includes(`--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nT\r\n`),
  );
  assert(text.includes('filename="a_b.png"'));
  assert(text.endsWith(`--${boundary}--\r\n`));
});

Deno.test("base64ToBytes accepts a data URI", () => {
  assertEquals([...base64ToBytes("data:image/png;base64,AQID")], [1, 2, 3]);
});
