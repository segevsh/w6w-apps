import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  compact,
  describeError,
  need,
  SeamlessClient,
  SeamlessError,
  segment,
  toIdList,
  toInt,
  toList,
  toObject,
  toObjectList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("toList: accepts arrays, JSON strings and comma / newline text; empty is undefined", () => {
  assertEquals(toList(["a", " b ", ""]), ["a", "b"]);
  assertEquals(toList('["x","y"]'), ["x", "y"]);
  assertEquals(toList("a, b\nc"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList([]), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("toIdList / toInt: integers only", () => {
  assertEquals(toIdList(["1", 2, "3"]), [1, 2, 3]);
  assertThrows(() => toIdList(["x"]), Error, "not an integer");
  assertEquals(toInt("7", "ID"), 7);
  assertEquals(toInt(undefined, "ID"), undefined);
  assertThrows(() => toInt("1.5", "ID"), Error, "integer");
});

Deno.test("toObject / toObjectList: parse JSON strings and reject the wrong shape", () => {
  assertEquals(toObject('{"a":1}', "X"), { a: 1 });
  assertEquals(toObject(undefined, "X"), undefined);
  assertThrows(() => toObject("[1]", "X"), Error, "JSON object");
  assertThrows(() => toObject("{", "X"), Error, "valid JSON");
  assertEquals(toObjectList('[{"a":1}]', "X"), [{ a: 1 }]);
  assertThrows(() => toObjectList('["a"]', "X"), Error, "array of objects");
  assertThrows(() => toObjectList("{", "X"), Error, "valid JSON");
});

Deno.test("compact keeps false and 0 but drops unset values and empty arrays", () => {
  assertEquals(compact({ a: false, b: 0, c: undefined, d: null, e: "", f: [], g: ["x"] }), {
    a: false,
    b: 0,
    g: ["x"],
  });
});

Deno.test("segment url-encodes and refuses blanks; need refuses blanks", () => {
  assertEquals(segment("a/b c", "ID"), "a%2Fb%20c");
  assertThrows(() => segment("  ", "ID"), Error, "ID is required");
  assertEquals(need(0, "N"), 0);
  assertThrows(() => need(undefined, "N"), Error, "N is required");
});

Deno.test("describeError reads both the documented {message} and the observed {msg} shapes", () => {
  assertEquals(describeError({ msg: "Invalid token" }), {
    message: "Invalid token",
    code: undefined,
  });
  assertEquals(describeError({ message: "boom", code: "rateLimitExceeded" }), {
    message: "boom",
    code: "rateLimitExceeded",
  });
  assertEquals(describeError("plain"), { message: "plain" });
  assertEquals(describeError(null), { message: undefined });
});

Deno.test("client: a 429 carries the vendor code and the reset time", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    headers: { "content-type": "application/json", "x-ratelimit-reset": "1745587198" },
    body: { code: "rateLimitExceeded", message: "Rate limit exceeded. Please wait and try again." },
  }]);
  const err = await assertRejects(
    () => new SeamlessClient(ctx).request("GET", "/lists"),
    SeamlessError,
    "rateLimitExceeded",
  );
  assertEquals(err.status, 429);
  assertEquals(err.code, "rateLimitExceeded");
  assertEquals(err.resetAt, 1745587198);
});

Deno.test("client: a non-JSON error body still produces a readable error", async () => {
  const { ctx } = mockCtx([{
    status: 502,
    body: "Bad gateway",
    headers: { "content-type": "text/html" },
  }]);
  await assertRejects(
    () => new SeamlessClient(ctx).request("GET", "/lists"),
    SeamlessError,
    "Bad gateway",
  );
});

Deno.test("client: an empty 200 body resolves to an empty object", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  assertEquals(await new SeamlessClient(ctx).request("DELETE", "/lists/1"), {});
});

Deno.test("client: never puts an Authorization header or a credential in the request", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await new SeamlessClient(ctx).request("POST", "/lists", { body: { name: "x" } });
  assertEquals(Object.keys(calls[0].headers).sort(), ["accept", "content-type"]);
});
