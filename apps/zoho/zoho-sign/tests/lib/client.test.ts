import { assert, assertEquals, assertThrows } from "@std/assert";
import { compact, formatSignError, parseJson, unwrapResource } from "../../lib/client.ts";

Deno.test("formatSignError: includes the vendor code and message when the body is JSON", () => {
  const msg = formatSignError(
    401,
    "GET",
    "/api/v1/templates",
    JSON.stringify({ code: 9041, message: "Invalid Oauth token" }),
  );
  assert(msg.includes("401"));
  assert(msg.includes("code 9041"));
  assert(msg.includes("Invalid Oauth token"));
});

Deno.test("formatSignError: falls back to the raw body when it is not JSON", () => {
  const msg = formatSignError(500, "POST", "/api/v1/requests", "upstream exploded");
  assert(msg.includes("upstream exploded"));
});

Deno.test("unwrapResource: returns the named key", () => {
  assertEquals(unwrapResource({ code: 0, requests: { request_id: "r1" } }, "requests"), {
    request_id: "r1",
  });
});

Deno.test("unwrapResource: throws when the key is absent", () => {
  assertThrows(() => unwrapResource({ code: 0, message: "ok" }, "requests"), Error, "requests");
});

Deno.test("compact: drops undefined/null/empty-string but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("parseJson: parses a JSON string param", () => {
  assertEquals(parseJson('[{"a":1}]', "actions"), [{ a: 1 }]);
});

Deno.test("parseJson: passes an already-parsed value through", () => {
  assertEquals(parseJson([{ a: 1 }], "actions"), [{ a: 1 }]);
});

Deno.test("parseJson: throws on missing required input", () => {
  assertThrows(() => parseJson(undefined, "actions"), Error, "actions");
});

Deno.test("parseJson: returns undefined for missing optional input", () => {
  assertEquals(parseJson(undefined, "fieldData", false), undefined);
});

Deno.test("parseJson: throws on malformed JSON", () => {
  assertThrows(() => parseJson("{not json", "actions"), Error, "valid JSON");
});
