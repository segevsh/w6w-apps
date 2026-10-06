import { assert, assertEquals } from "@std/assert";
import { codeOf, compact, messageOf, multipart, toList } from "../../lib/client.ts";

Deno.test("messageOf / codeOf read Murf's error envelope", () => {
  assertEquals(messageOf({ error_message: " bad ", error_code: 403 }), "bad");
  assertEquals(codeOf({ error_message: "x", error_code: 403 }), 403);
  assertEquals(messageOf(null), undefined);
  assertEquals(codeOf([]), undefined);
});

Deno.test("multipart: repeated fields, one boundary, CRLF framing, quotes stripped from names", () => {
  const m = multipart([["target_locales", "fr_FR"], ["target_locales", "de_DE"], ['a"b', "v"]]);
  const boundary = m.contentType.split("boundary=")[1];
  assert(boundary.length > 10);
  assertEquals(m.body.split(`--${boundary}\r\n`).length, 4);
  assert(m.body.endsWith(`--${boundary}--\r\n`));
  assert(m.body.includes('name="target_locales"\r\n\r\nfr_FR\r\n'));
  assert(m.body.includes('name="ab"'));
});

Deno.test("toList splits commas/newlines, accepts arrays, rejects empty", () => {
  assertEquals(toList("fr_FR, de_DE\nes_ES", "x"), ["fr_FR", "de_DE", "es_ES"]);
  assertEquals(toList(["a", " b "], "x"), ["a", "b"]);
  let msg = "";
  try {
    toList("  ,", "targetLocales");
  } catch (e) {
    msg = String(e);
  }
  assert(msg.includes("targetLocales"));
});

Deno.test("compact drops undefined, null and empty strings only", () => {
  assertEquals(compact({ a: 0, b: false, c: "", d: null, e: undefined, f: "x" }), {
    a: 0,
    b: false,
    f: "x",
  });
});
