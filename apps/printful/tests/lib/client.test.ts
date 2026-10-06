import { assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  errorText,
  jsonValue,
  PrintfulClient,
  seg,
  typeList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: seg encodes, buildQuery skips empties", () => {
  assertEquals(seg("@a b"), "%40a%20b");
  assertEquals(buildQuery({ a: 1, b: "", c: undefined, d: false }), "?a=1&d=false");
  assertEquals(buildQuery(undefined), "");
});

Deno.test("client: jsonValue parses text and passes through the rest", () => {
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("  "), undefined);
  assertEquals(jsonValue("nope"), "nope");
  assertEquals(jsonValue([1]), [1]);
});

Deno.test("client: typeList takes arrays, JSON text and comma text", () => {
  assertEquals(typeList(["a", "b"]), ["a", "b"]);
  assertEquals(typeList('["a","b"]'), ["a", "b"]);
  assertEquals(typeList("a, b,,"), ["a", "b"]);
  assertEquals(typeList(""), undefined);
});

Deno.test("client: errorText prefers error.reason/message, then result text, then raw", () => {
  assertEquals(errorText({ error: { reason: "R", message: "M" } }), "R: M");
  assertEquals(errorText({ result: "plain" }), "plain");
  assertEquals(errorText(undefined, "  raw body "), "raw body");
});

Deno.test("client: send unwraps result and paging, request returns result", async () => {
  const { ctx } = mockCtx([{
    body: { code: 200, result: [{ id: 1 }], paging: { total: 1, offset: 0, limit: 1 } },
  }]);
  const out = await new PrintfulClient(ctx).list("/orders");
  assertEquals(out, { items: [{ id: 1 }], paging: { total: 1, offset: 0, limit: 1 } });
});

Deno.test("client: a non-array list result becomes an empty list", async () => {
  const { ctx } = mockCtx([{ body: { code: 200, result: {} } }]);
  assertEquals(await new PrintfulClient(ctx).list("/orders"), { items: [] });
});

Deno.test("client: a non-JSON failure reports the raw text", async () => {
  const { ctx } = mockCtx([{ status: 502, headers: {}, body: "Bad gateway" }]);
  await assertRejects(
    async () => await new PrintfulClient(ctx).request("GET", "/x"),
    Error,
    "HTTP 502 — Bad gateway",
  );
});

Deno.test("client: a JSON body is sent with a content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 200, result: {} } }]);
  await new PrintfulClient(ctx).request("POST", "/files", { body: { url: "u" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"url":"u"}');
});
