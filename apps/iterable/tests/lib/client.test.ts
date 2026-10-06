import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  apiBase,
  bool,
  call,
  int,
  intList,
  jsonArray,
  jsonObject,
  oneOf,
  regionFromConnection,
  str,
  strList,
} from "../../lib/client.ts";

Deno.test("regionFromConnection: eu only when display.region is eu, else us", () => {
  assertEquals(regionFromConnection(undefined), "us");
  assertEquals(regionFromConnection({ display: { region: "eu" } } as never), "eu");
  assertEquals(regionFromConnection({ display: { region: "mars" } } as never), "us");
  assertEquals(apiBase("us"), "https://api.iterable.com/api");
  assertEquals(apiBase("eu"), "https://api.eu.iterable.com/api");
});

Deno.test("readers: coerce and validate", () => {
  assertEquals(str("  a "), "a");
  assertEquals(str(""), undefined);
  assertEquals(str(5), "5");
  assertEquals(int("n", "7"), 7);
  assertEquals(int("n", undefined), undefined);
  assertEquals(bool("true"), true);
  assertEquals(bool(undefined), undefined);
  assertEquals(intList("l", "1, 2 3"), [1, 2, 3]);
  assertEquals(strList("a, b,"), ["a", "b"]);
  assertEquals(jsonObject("o", '{"a":1}'), { a: 1 });
  assertEquals(jsonArray("a", "[1]"), [1]);
});

Deno.test("readers: reject malformed input", () => {
  assertThrows(() => int("n", "1.5"), Error, "`n` must be an integer");
  assertThrows(() => intList("l", "a"), Error, "list of integers");
  assertThrows(() => jsonObject("o", "[1]"), Error, "JSON object");
  assertThrows(() => jsonObject("o", "{bad"), Error, "not valid JSON");
  assertThrows(() => jsonArray("a", "{}"), Error, "JSON array");
});

Deno.test("oneOf: exactly-one and at-least-one", () => {
  oneOf(["a", "b"], { a: 1, b: undefined });
  assertThrows(() => oneOf(["a", "b"], { a: 1, b: 2 }), Error, "provide only one");
  assertThrows(() => oneOf(["a", "b"], {}), Error, "is required");
  oneOf(["a", "b"], { a: 1, b: 2 }, "at-least-one");
});

Deno.test("call: repeats array query keys, sends JSON bodies, never sets credentials", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: "Success" } }]);
  await call(ctx, "POST", "/x", {
    query: { id: [1, 2], skip: undefined, q: "a b" },
    body: { a: 1 },
  });
  assertEquals(calls[0].url, "https://api.iterable.com/api/x?id=1&id=2&q=a+b");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["api-key"], undefined);
});

Deno.test("call: an empty 2xx body is Success, a text endpoint returns { text }", async () => {
  const { ctx } = mockCtx([{ status: 202 }, {
    body: "a\nb",
    headers: { "content-type": "text/plain" },
  }]);
  assertEquals(await call(ctx, "DELETE", "/x"), { code: "Success" });
  assertEquals(await call(ctx, "GET", "/y", { text: true }), { text: "a\nb" });
});

Deno.test("call: a text endpoint answering 200 with an error envelope still throws", async () => {
  const { ctx } = mockCtx([{ body: { code: "BadParams", msg: "bad" } }]);
  await assertRejects(() => call(ctx, "GET", "/y", { text: true }), Error, "BadParams: bad");
});

Deno.test("call: non-JSON error bodies are truncated into the message", async () => {
  const { ctx } = mockCtx([{
    status: 502,
    body: "<html>bad gateway</html>",
    headers: { "content-type": "text/html" },
  }]);
  await assertRejects(() => call(ctx, "GET", "/y"), Error, "Iterable 502 for GET /y: <html>");
});
