import { assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  asOptionalJson,
  compact,
  encodeId,
  errorMessage,
  formatTavilyError,
  TavilyClient,
  toList,
  truncate,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: base is the single declared server", () => {
  assertEquals(API_BASE, "https://api.tavily.com");
});

Deno.test("client: compact drops undefined, null and empty strings but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0 }), { d: false, e: 0 });
});

Deno.test("client: toList splits commas and newlines", () => {
  assertEquals(toList("a, b\n c,,"), ["a", "b", "c"]);
  assertEquals(toList(["a", " b "]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("client: errorMessage handles object, array and non-JSON details", () => {
  assertEquals(errorMessage('{"detail":{"error":"bad"}}'), "bad");
  assertEquals(errorMessage('{"detail":[{"loc":["body","q"],"msg":"m"}]}'), "body.q: m");
  assertEquals(errorMessage('{"detail":"plain"}'), "plain");
  assertEquals(errorMessage("<html>"), undefined);
});

Deno.test("client: 432 and 433 get a plain-language hint", () => {
  assertEquals(
    formatTavilyError(432, "POST", "/search", '{"detail":{"error":"x"}}').includes(
      "plan credit limit",
    ),
    true,
  );
  assertEquals(formatTavilyError(433, "POST", "/search", "{}").includes("pay-as-you-go"), true);
  assertEquals(formatTavilyError(429, "GET", "/usage", "{}").includes("Retry-After"), true);
});

Deno.test("client: json() sends query params and treats 202 as success", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { status: "pending" } }]);
  const out = await new TavilyClient(ctx).json("/x", { query: { a: "1", b: undefined, c: false } });
  assertEquals(out, { status: "pending" });
  assertEquals(calls[0].url, "https://api.tavily.com/x?a=1&c=false");
});

Deno.test("client: a non-OK response throws and an empty OK body is undefined", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  await assertRejects(() => new TavilyClient(ctx).json("/x"), Error, "Tavily 500");
  const empty = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await new TavilyClient(empty.ctx).json("/x"), undefined);
});

Deno.test("client: helpers", () => {
  assertEquals(truncate("abc", 2).startsWith("ab…"), true);
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertEquals(asOptionalJson("", "l"), undefined);
  assertEquals(asOptionalJson('{"a":1}', "l"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "l"), { a: 1 });
});
